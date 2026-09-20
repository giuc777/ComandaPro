-- ============================================
-- FASE 6: Procedimientos Almacenados - Ordenes POS
-- ============================================
USE comandapro;

-- ============================================
-- TABLES (minimal read-only; FASE 09 owns full CRUD)
-- ============================================
DROP PROCEDURE IF EXISTS sp_list_tables;
DELIMITER //
CREATE PROCEDURE sp_list_tables()
BEGIN
    SELECT id, name, capacity, status, current_order_id
    FROM tables
    ORDER BY id;
END //
DELIMITER ;

-- ============================================
-- ORDERS - Flujo de pausado
-- ============================================

-- Crear orden pausada
DROP PROCEDURE IF EXISTS sp_create_parked_order;
DELIMITER //
CREATE PROCEDURE sp_create_parked_order(
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('mesa','llevar'),
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO orders (table_id, customer_name, mode, notes, created_by, status, parked_at)
    VALUES (p_table_id, p_customer_name, p_mode, p_notes, p_created_by, 'pausada', CURRENT_TIMESTAMP);
    SELECT LAST_INSERT_ID() AS order_id;
END //
DELIMITER ;

-- Agregar ítem a orden
DROP PROCEDURE IF EXISTS sp_add_order_item;
DELIMITER //
CREATE PROCEDURE sp_add_order_item(
    IN p_order_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_unit_price DECIMAL(10,2),
    IN p_modifiers JSON,
    IN p_modifier_labels TEXT,
    IN p_notes TEXT
)
BEGIN
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, modifiers, modifier_labels, notes)
    VALUES (p_order_id, p_product_id, p_quantity, p_unit_price, p_modifiers, p_modifier_labels, p_notes);
    CALL sp_recalculate_order_totals(p_order_id);
    SELECT LAST_INSERT_ID() AS item_id;
END //
DELIMITER ;

-- Recalcular totales de orden
DROP PROCEDURE IF EXISTS sp_recalculate_order_totals;
DELIMITER //
CREATE PROCEDURE sp_recalculate_order_totals(IN p_order_id INT)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,4) DEFAULT 0.12;

    SELECT IFNULL(SUM(quantity * unit_price), 0) INTO v_subtotal
    FROM order_items WHERE order_id = p_order_id;

    UPDATE orders
    SET subtotal = v_subtotal,
        tax = v_subtotal * v_tax_rate,
        total = v_subtotal + (v_subtotal * v_tax_rate)
    WHERE id = p_order_id;
END //
DELIMITER ;

-- Listar órdenes pausadas (para el panel de pausadas)
DROP PROCEDURE IF EXISTS sp_list_parked_orders;
DELIMITER //
CREATE PROCEDURE sp_list_parked_orders()
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.subtotal, o.tax, o.total,
           o.created_by, u.name AS created_by_name,
           o.parked_at,
           TIMESTAMPDIFF(MINUTE, o.parked_at, NOW()) AS minutes_parked,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
           (SELECT IFNULL(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS total_units
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status = 'pausada'
    ORDER BY o.parked_at ASC;
END //
DELIMITER ;

-- Obtener orden con ítems
DROP PROCEDURE IF EXISTS sp_get_order;
DELIMITER //
CREATE PROCEDURE sp_get_order(IN p_order_id INT)
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes,
           o.subtotal, o.tax, o.total,
           o.created_by, u.name AS created_by_name, o.parked_at, o.voided_at
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.id = p_order_id;

    SELECT oi.id, oi.product_id, p.name AS product_name, p.image AS product_image,
           oi.quantity, oi.unit_price, oi.modifiers, oi.modifier_labels, oi.notes
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id;
END //
DELIMITER ;

-- Retomar / editar orden pausada
DROP PROCEDURE IF EXISTS sp_reopen_order;
DELIMITER //
CREATE PROCEDURE sp_reopen_order(
    IN p_order_id INT,
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('mesa','llevar'),
    IN p_notes TEXT
)
BEGIN
    UPDATE orders
    SET table_id = p_table_id,
        customer_name = p_customer_name,
        mode = p_mode,
        notes = p_notes
    WHERE id = p_order_id AND status = 'pausada';
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar todos los ítems de una orden (para replaceItems)
DROP PROCEDURE IF EXISTS sp_clear_order_items;
DELIMITER //
CREATE PROCEDURE sp_clear_order_items(IN p_order_id INT)
BEGIN
    DELETE FROM order_items WHERE order_id = p_order_id;
    SELECT ROW_COUNT() AS deleted;
END //
DELIMITER ;

-- Eliminar un ítem de orden
DROP PROCEDURE IF EXISTS sp_delete_order_item;
DELIMITER //
CREATE PROCEDURE sp_delete_order_item(IN p_item_id INT)
BEGIN
    DELETE FROM order_items WHERE id = p_item_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Anular orden (no se puede anular una ya pagada)
DROP PROCEDURE IF EXISTS sp_void_order;
DELIMITER //
CREATE PROCEDURE sp_void_order(IN p_order_id INT, IN p_user_id INT)
BEGIN
    UPDATE orders
    SET status = 'anulada', voided_at = CURRENT_TIMESTAMP, voided_by = p_user_id
    WHERE id = p_order_id AND status NOT IN ('pagada', 'anulada');
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Listar ordenes por status (uso futuro)
DROP PROCEDURE IF EXISTS sp_list_orders_by_status;
DELIMITER //
CREATE PROCEDURE sp_list_orders_by_status(IN p_status ENUM('pausada','pagada','anulada','enviada','preparando','lista','completada'))
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.subtotal, o.tax, o.total,
           o.created_by, u.name AS created_by_name,
           o.parked_at, o.voided_at
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status = p_status
    ORDER BY o.parked_at ASC, o.created_at DESC;
END //
DELIMITER ;
