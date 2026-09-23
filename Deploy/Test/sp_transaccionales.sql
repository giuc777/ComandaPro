-- ============================================
-- DeerCoffee / ComandaPro - sp_transaccionales.sql
-- Procedimientos que modifican VARIAS tablas (operaciones atomicas)
-- Total: 9 procedimientos
-- ============================================
USE `comandapro`;

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_add_order_item`$$
CREATE PROCEDURE `sp_add_order_item`(
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
END$$

DROP PROCEDURE IF EXISTS `sp_add_po_item`$$
CREATE PROCEDURE `sp_add_po_item`(
    IN p_po_id INT,
    IN p_inventory_id INT,
    IN p_quantity DECIMAL(10,3),
    IN p_unit_cost DECIMAL(10,2)
)
BEGIN
    INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_cost)
    VALUES (p_po_id, p_inventory_id, p_quantity, p_unit_cost);

    
    UPDATE purchase_orders
    SET total = (SELECT IFNULL(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE po_id = p_po_id)
    WHERE id = p_po_id;

    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_mesa_with_table`$$
CREATE PROCEDURE `sp_create_mesa_with_table`(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT, IN p_capacity INT
)
BEGIN
    DECLARE v_table_id INT;
    DECLARE v_item_id INT;

    
    INSERT INTO tables (name, capacity) VALUES (p_name, p_capacity);
    SET v_table_id = LAST_INSERT_ID();

    
    INSERT INTO catalog_items (group_id, name, description, icon, color, sort_order, capacity, table_id)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_sort_order, p_capacity, v_table_id);
    SET v_item_id = LAST_INSERT_ID();

    SELECT v_item_id AS item_id, v_table_id AS table_id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_parked_order`$$
CREATE PROCEDURE `sp_create_parked_order`(
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('mesa','llevar'),
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    DECLARE v_order_id INT;

    INSERT INTO orders (table_id, customer_name, mode, notes, created_by, status, parked_at)
    VALUES (p_table_id, p_customer_name, p_mode, p_notes, p_created_by, 'pausada', CURRENT_TIMESTAMP);

    SET v_order_id = LAST_INSERT_ID();

    
    IF p_table_id IS NOT NULL THEN
        UPDATE tables SET status = 'occupied', current_order_id = v_order_id
        WHERE id = p_table_id;
    END IF;

    SELECT v_order_id AS order_id;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_mesa_with_table`$$
CREATE PROCEDURE `sp_delete_mesa_with_table`(IN p_item_id INT)
BEGIN
    DECLARE v_table_id INT;
    DECLARE v_status VARCHAR(20);

    SELECT table_id INTO v_table_id FROM catalog_items WHERE id = p_item_id;

    
    UPDATE catalog_items SET active = FALSE WHERE id = p_item_id;

    
    IF v_table_id IS NOT NULL THEN
        SELECT status INTO v_status FROM tables WHERE id = v_table_id;
        IF v_status = 'free' THEN
            DELETE FROM tables WHERE id = v_table_id;
        END IF;
    END IF;

    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_po_item`$$
CREATE PROCEDURE `sp_delete_po_item`(IN p_item_id INT)
BEGIN
    DECLARE v_po_id INT;

    SELECT po_id INTO v_po_id FROM purchase_order_items WHERE id = p_item_id;

    DELETE FROM purchase_order_items WHERE id = p_item_id;

    
    UPDATE purchase_orders
    SET total = (SELECT IFNULL(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE po_id = v_po_id)
    WHERE id = v_po_id;

    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_receive_purchase_order`$$
CREATE PROCEDURE `sp_receive_purchase_order`(IN p_po_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_inv_id INT;
    DECLARE v_qty DECIMAL(10,3);
    DECLARE v_status VARCHAR(20);

    DECLARE cur CURSOR FOR
        SELECT inventory_id, quantity FROM purchase_order_items WHERE po_id = p_po_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    
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
END$$

DROP PROCEDURE IF EXISTS `sp_record_payment`$$
CREATE PROCEDURE `sp_record_payment`(
    IN p_order_id INT,
    IN p_method ENUM('efectivo','tarjeta','qr'),
    IN p_amount_given DECIMAL(10,2),
    IN p_cashier_id INT,
    IN p_sat_invoice VARCHAR(50),
    IN p_apply_tax BOOLEAN
)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_amount DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_change DECIMAL(10,2) DEFAULT 0;
    DECLARE v_shift_id INT DEFAULT NULL;
    DECLARE v_payment_id INT DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    
    SELECT subtotal, total, status INTO v_subtotal, v_total, v_status
    FROM orders WHERE id = p_order_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Orden no encontrada';
    END IF;

    IF v_status <> 'pausada' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden cobrar ordenes en estado pausada';
    END IF;

    
    SELECT id INTO v_shift_id
    FROM shifts WHERE status = 'open'
    ORDER BY start_time DESC LIMIT 1;

    IF v_shift_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Debe abrir un turno de caja antes de cobrar';
    END IF;

    
    IF p_apply_tax = FALSE THEN
        SET v_amount = v_subtotal;
    ELSE
        SET v_amount = v_total;
    END IF;

    
    IF p_method = 'efectivo' AND p_amount_given IS NOT NULL THEN
        SET v_change = p_amount_given - v_amount;
    END IF;

    
    INSERT INTO payments (order_id, method, amount, amount_given, change_amount, cashier_id, sat_invoice)
    VALUES (p_order_id, p_method, v_amount, p_amount_given, v_change, p_cashier_id, p_sat_invoice);

    
    SET v_payment_id = LAST_INSERT_ID();

    
    IF p_apply_tax = FALSE THEN
        UPDATE orders SET status = 'pagada', tax = 0, total = subtotal WHERE id = p_order_id;
    ELSE
        UPDATE orders SET status = 'pagada' WHERE id = p_order_id;
    END IF;

    
    UPDATE tables SET status = 'dirty', current_order_id = NULL
    WHERE current_order_id = p_order_id;

    
    INSERT INTO shift_transactions (shift_id, order_id, type, method, amount)
    VALUES (v_shift_id, p_order_id, 'sale', p_method, v_amount);

    
    
    CALL sp_deduct_inventory(p_order_id);

    COMMIT;

    SELECT v_payment_id AS payment_id, v_change AS change_amount, v_amount AS amount;
END$$

DROP PROCEDURE IF EXISTS `sp_update_mesa_with_table`$$
CREATE PROCEDURE `sp_update_mesa_with_table`(
    IN p_item_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_capacity INT
)
BEGIN
    DECLARE v_table_id INT;

    SELECT table_id INTO v_table_id FROM catalog_items WHERE id = p_item_id;

    
    UPDATE catalog_items
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        capacity = COALESCE(p_capacity, capacity)
    WHERE id = p_item_id;

    
    IF v_table_id IS NOT NULL THEN
        UPDATE tables
        SET name = COALESCE(p_name, name),
            capacity = COALESCE(p_capacity, capacity)
        WHERE id = v_table_id;
    END IF;

    SELECT ROW_COUNT() AS affected;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
