-- ============================================
-- FASE 8: Procedimientos de Proveedores
-- ============================================
USE comandapro;

-- ============================================
-- PROVEEDORES
-- ============================================

-- Listar proveedores activos
DROP PROCEDURE IF EXISTS sp_list_suppliers;
DELIMITER //
CREATE PROCEDURE sp_list_suppliers()
BEGIN
    SELECT id, name, contact_name, phone, email, address, status, created_at
    FROM suppliers
    WHERE status = 'Activo'
    ORDER BY name;
END //
DELIMITER ;

-- Listar todos los proveedores (admin)
DROP PROCEDURE IF EXISTS sp_list_all_suppliers;
DELIMITER //
CREATE PROCEDURE sp_list_all_suppliers()
BEGIN
    SELECT id, name, contact_name, phone, email, address, status, created_at
    FROM suppliers
    ORDER BY status DESC, name;
END //
DELIMITER ;

-- Detalle de proveedor con historial
DROP PROCEDURE IF EXISTS sp_get_supplier_detail;
DELIMITER //
CREATE PROCEDURE sp_get_supplier_detail(IN p_supplier_id INT)
BEGIN
    SELECT id, name, contact_name, phone, email, address, status, notes
    FROM suppliers WHERE id = p_supplier_id;

    SELECT po.id, po.status, po.total, po.notes, po.created_at, po.received_at,
           u.name AS created_by_name,
           (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) AS item_count
    FROM purchase_orders po
    JOIN users u ON po.created_by = u.id
    WHERE po.supplier_id = p_supplier_id
    ORDER BY po.created_at DESC
    LIMIT 10;
END //
DELIMITER ;

-- Crear proveedor
DROP PROCEDURE IF EXISTS sp_create_supplier;
DELIMITER //
CREATE PROCEDURE sp_create_supplier(
    IN p_name VARCHAR(100),
    IN p_contact_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address TEXT,
    IN p_notes TEXT
)
BEGIN
    INSERT INTO suppliers (name, contact_name, phone, email, address, notes)
    VALUES (p_name, p_contact_name, p_phone, p_email, p_address, p_notes);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar proveedor
DROP PROCEDURE IF EXISTS sp_update_supplier;
DELIMITER //
CREATE PROCEDURE sp_update_supplier(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_contact_name VARCHAR(100),
    IN p_phone VARCHAR(20),
    IN p_email VARCHAR(100),
    IN p_address TEXT,
    IN p_notes TEXT,
    IN p_status ENUM('Activo', 'Inactivo')
)
BEGIN
    UPDATE suppliers
    SET name = p_name,
        contact_name = p_contact_name,
        phone = p_phone,
        email = p_email,
        address = p_address,
        notes = p_notes,
        status = p_status
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- ============================================
-- ORDENES DE COMPRA
-- ============================================

-- Crear orden de compra
DROP PROCEDURE IF EXISTS sp_create_purchase_order;
DELIMITER //
CREATE PROCEDURE sp_create_purchase_order(
    IN p_supplier_id INT,
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO purchase_orders (supplier_id, notes, created_by)
    VALUES (p_supplier_id, p_notes, p_created_by);
    SELECT LAST_INSERT_ID() AS po_id;
END //
DELIMITER ;

-- Listar ordenes de compra (filtro por proveedor y status)
DROP PROCEDURE IF EXISTS sp_list_purchase_orders;
DELIMITER //
CREATE PROCEDURE sp_list_purchase_orders(
    IN p_supplier_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    SELECT po.id, po.supplier_id, s.name AS supplier_name,
           po.status, po.total, po.notes, po.created_at, po.received_at,
           u.name AS created_by_name,
           (SELECT COUNT(*) FROM purchase_order_items WHERE po_id = po.id) AS item_count
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    WHERE (p_supplier_id IS NULL OR po.supplier_id = p_supplier_id)
      AND (p_status IS NULL OR po.status = p_status)
    ORDER BY po.created_at DESC;
END //
DELIMITER ;

-- Detalle de orden de compra con items
DROP PROCEDURE IF EXISTS sp_get_purchase_order;
DELIMITER //
CREATE PROCEDURE sp_get_purchase_order(IN p_po_id INT)
BEGIN
    SELECT po.id, po.supplier_id, s.name AS supplier_name, s.contact_name, s.phone,
           po.status, po.total, po.notes, po.created_at, po.received_at,
           u.name AS created_by_name
    FROM purchase_orders po
    JOIN suppliers s ON po.supplier_id = s.id
    JOIN users u ON po.created_by = u.id
    WHERE po.id = p_po_id;

    SELECT poi.id, poi.inventory_id, i.name AS inventory_name, i.unit,
           poi.quantity, poi.unit_cost, (poi.quantity * poi.unit_cost) AS line_total
    FROM purchase_order_items poi
    JOIN inventory i ON poi.inventory_id = i.id
    WHERE poi.po_id = p_po_id
    ORDER BY i.name;
END //
DELIMITER ;

-- Agregar item a orden de compra
DROP PROCEDURE IF EXISTS sp_add_po_item;
DELIMITER //
CREATE PROCEDURE sp_add_po_item(
    IN p_po_id INT,
    IN p_inventory_id INT,
    IN p_quantity DECIMAL(10,3),
    IN p_unit_cost DECIMAL(10,2)
)
BEGIN
    INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_cost)
    VALUES (p_po_id, p_inventory_id, p_quantity, p_unit_cost);

    -- Actualizar total de la PO
    UPDATE purchase_orders
    SET total = (SELECT IFNULL(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE po_id = p_po_id)
    WHERE id = p_po_id;

    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Eliminar item de orden de compra
DROP PROCEDURE IF EXISTS sp_delete_po_item;
DELIMITER //
CREATE PROCEDURE sp_delete_po_item(IN p_item_id INT)
BEGIN
    DECLARE v_po_id INT;

    SELECT po_id INTO v_po_id FROM purchase_order_items WHERE id = p_item_id;

    DELETE FROM purchase_order_items WHERE id = p_item_id;

    -- Recalcular total
    UPDATE purchase_orders
    SET total = (SELECT IFNULL(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE po_id = v_po_id)
    WHERE id = v_po_id;

    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Recibir orden de compra (actualiza inventario)
DROP PROCEDURE IF EXISTS sp_receive_purchase_order;
DELIMITER //
CREATE PROCEDURE sp_receive_purchase_order(IN p_po_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_inv_id INT;
    DECLARE v_qty DECIMAL(10,3);
    DECLARE v_status VARCHAR(20);

    DECLARE cur CURSOR FOR
        SELECT inventory_id, quantity FROM purchase_order_items WHERE po_id = p_po_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Verificar que este pendiente
    SELECT status INTO v_status FROM purchase_orders WHERE id = p_po_id;
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Orden de compra no encontrada';
    END IF;
    IF v_status <> 'pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se pueden recibir ordenes pendientes';
    END IF;

    OPEN cur;
    receive_loop: LOOP
        FETCH cur INTO v_inv_id, v_qty;
        IF v_done THEN LEAVE receive_loop; END IF;
        UPDATE inventory SET stock = stock + v_qty WHERE id = v_inv_id;
    END LOOP receive_loop;
    CLOSE cur;

    UPDATE purchase_orders
    SET status = 'received', received_at = CURRENT_TIMESTAMP
    WHERE id = p_po_id;
END //
DELIMITER ;

-- Cancelar orden de compra
DROP PROCEDURE IF EXISTS sp_cancel_purchase_order;
DELIMITER //
CREATE PROCEDURE sp_cancel_purchase_order(IN p_po_id INT)
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT status INTO v_status FROM purchase_orders WHERE id = p_po_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Orden de compra no encontrada';
    END IF;
    IF v_status <> 'pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se pueden cancelar ordenes pendientes';
    END IF;

    UPDATE purchase_orders SET status = 'cancelled' WHERE id = p_po_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;
