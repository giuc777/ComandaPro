-- ============================================
-- DeerCoffee / ComandaPro - sp_simple.sql
-- Procedimientos que modifican UNA SOLA tabla
-- Total: 44 procedimientos
-- ============================================
USE `DeerCoffeeDB`;

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_add_to_blacklist`$$
CREATE PROCEDURE `sp_add_to_blacklist`(
    IN p_jti VARCHAR(50),
    IN p_user_id INT,
    IN p_expires_at TIMESTAMP,
    IN p_reason VARCHAR(200)
)
BEGIN
    INSERT INTO token_blacklist (jti, user_id, expires_at, reason)
    VALUES (p_jti, p_user_id, p_expires_at, p_reason);
END$$

DROP PROCEDURE IF EXISTS `sp_assign_product_modifier_groups`$$
CREATE PROCEDURE `sp_assign_product_modifier_groups`(
    IN p_product_id INT,
    IN p_group_ids JSON
)
BEGIN
    DELETE FROM product_modifier_groups WHERE product_id = p_product_id;

    IF p_group_ids IS NOT NULL AND JSON_LENGTH(p_group_ids) > 0 THEN
        INSERT INTO product_modifier_groups (product_id, group_id)
        SELECT p_product_id, j.val
        FROM JSON_TABLE(p_group_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        WHERE EXISTS (
            SELECT 1 FROM catalog_groups cg
            WHERE cg.id = j.val AND cg.active = TRUE AND cg.is_modifier = TRUE
        );
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_cancel_purchase_order`$$
CREATE PROCEDURE `sp_cancel_purchase_order`(IN p_po_id INT)
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
END$$

DROP PROCEDURE IF EXISTS `sp_change_password`$$
CREATE PROCEDURE `sp_change_password`(
    IN p_id INT,
    IN p_new_password_hash VARCHAR(255)
)
BEGIN
    UPDATE users
    SET password_hash = p_new_password_hash,
        failed_attempts = 0,
        locked_until = NULL
    WHERE id = p_id;

    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_clean_expired_blacklist`$$
CREATE PROCEDURE `sp_clean_expired_blacklist`()
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END$$

DROP PROCEDURE IF EXISTS `sp_clean_expired_tokens`$$
CREATE PROCEDURE `sp_clean_expired_tokens`()
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked = TRUE;
END$$

DROP PROCEDURE IF EXISTS `sp_clear_order_items`$$
CREATE PROCEDURE `sp_clear_order_items`(IN p_order_id INT)
BEGIN
    DELETE FROM order_items WHERE order_id = p_order_id;
    SELECT ROW_COUNT() AS deleted;
END$$

DROP PROCEDURE IF EXISTS `sp_close_shift`$$
CREATE PROCEDURE `sp_close_shift`(
    IN p_shift_id INT,
    IN p_actual_cash DECIMAL(10,2)
)
BEGIN
    DECLARE v_start_cash DECIMAL(10,2);
    DECLARE v_expected_cash DECIMAL(10,2);
    DECLARE v_difference DECIMAL(10,2);

    SELECT start_cash INTO v_start_cash FROM shifts WHERE id = p_shift_id AND status = 'open';

    IF v_start_cash IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Turno no encontrado o ya cerrado';
    END IF;

    
    SELECT IFNULL(v_start_cash + SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), v_start_cash)
    INTO v_expected_cash
    FROM shift_transactions
    WHERE shift_id = p_shift_id AND type = 'sale';

    SET v_difference = p_actual_cash - v_expected_cash;

    
    SELECT IFNULL(SUM(amount), 0) INTO @total_sales
    FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale';
    SELECT IFNULL(SUM(amount), 0) INTO @cash_sales
    FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'efectivo';
    SELECT IFNULL(SUM(amount), 0) INTO @card_sales
    FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'tarjeta';
    SELECT IFNULL(SUM(amount), 0) INTO @qr_sales
    FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'qr';
    SELECT COUNT(*) INTO @tx_count
    FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale';

    UPDATE shifts
    SET status = 'closed', close_time = CURRENT_TIMESTAMP,
        actual_cash = p_actual_cash, expected_cash = v_expected_cash,
        difference = v_difference,
        total_sales = @total_sales, cash_sales = @cash_sales,
        card_sales = @card_sales, qr_sales = @qr_sales,
        transaction_count = @tx_count
    WHERE id = p_shift_id;

    SELECT v_expected_cash AS expected_cash, p_actual_cash AS actual_cash,
           v_difference AS difference, @total_sales AS total_sales,
           @cash_sales AS cash_sales, @card_sales AS card_sales,
           @qr_sales AS qr_sales, @tx_count AS transaction_count;
END$$

DROP PROCEDURE IF EXISTS `sp_create_catalog_group`$$
CREATE PROCEDURE `sp_create_catalog_group`(
    IN p_name VARCHAR(100), IN p_slug VARCHAR(50),
    IN p_description TEXT, IN p_sort_order INT,
    IN p_is_modifier BOOLEAN, IN p_required BOOLEAN, IN p_max_selections INT
)
BEGIN
    INSERT INTO catalog_groups (name, slug, description, sort_order, is_modifier, required, max_selections)
    VALUES (p_name, p_slug, p_description, p_sort_order, p_is_modifier, p_required, p_max_selections);
    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_catalog_item`$$
CREATE PROCEDURE `sp_create_catalog_item`(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_price_adjustment DECIMAL(10,2),
    IN p_capacity INT, IN p_table_id INT
)
BEGIN
    INSERT INTO catalog_items (group_id, name, description, icon, color, parent_id, sort_order, price_adjustment, capacity, table_id)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_parent_id, p_sort_order, p_price_adjustment, p_capacity, p_table_id);
    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_inventory_item`$$
CREATE PROCEDURE `sp_create_inventory_item`(
    IN p_catalog_item_id INT,
    IN p_name VARCHAR(100),
    IN p_unit VARCHAR(20),
    IN p_stock DECIMAL(10,3),
    IN p_min_stock DECIMAL(10,3),
    IN p_cost_per_unit DECIMAL(10,2),
    IN p_supplier_id INT
)
BEGIN
    DECLARE v_valid INT DEFAULT 0;

    
    IF p_catalog_item_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_valid
        FROM catalog_items ci
        JOIN catalog_groups cg ON ci.group_id = cg.id
        WHERE ci.id = p_catalog_item_id AND cg.slug = 'ingredientes_principales';
    ELSE
        SET v_valid = 1;
    END IF;

    IF v_valid = 1 THEN
        INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id)
        VALUES (p_catalog_item_id, p_name, p_unit, p_stock, p_min_stock, p_cost_per_unit, p_supplier_id);
        SELECT LAST_INSERT_ID() AS id;
    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'catalog_item_id no pertenece a ingredientes_principales';
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_create_product`$$
CREATE PROCEDURE `sp_create_product`(
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255),
    IN p_sort_order INT
)
BEGIN
    INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order)
    VALUES (p_name, p_category_id, p_price, p_cost, p_description, p_badge, p_image, p_sort_order);
    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_purchase_order`$$
CREATE PROCEDURE `sp_create_purchase_order`(
    IN p_supplier_id INT,
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO purchase_orders (supplier_id, notes, created_by)
    VALUES (p_supplier_id, p_notes, p_created_by);
    SELECT LAST_INSERT_ID() AS po_id;
END$$

DROP PROCEDURE IF EXISTS `sp_create_refresh_token`$$
CREATE PROCEDURE `sp_create_refresh_token`(
    IN p_user_id INT,
    IN p_token_hash VARCHAR(64),
    IN p_expires_at TIMESTAMP,
    IN p_user_agent VARCHAR(500),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES (p_user_id, p_token_hash, p_expires_at, p_user_agent, p_ip_address);
END$$

DROP PROCEDURE IF EXISTS `sp_create_supplier`$$
CREATE PROCEDURE `sp_create_supplier`(
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
END$$

DROP PROCEDURE IF EXISTS `sp_create_user`$$
CREATE PROCEDURE `sp_create_user`(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero')
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        RESIGNAL;
    END;

    INSERT INTO users (username, password_hash, name, email, role)
    VALUES (p_username, p_password_hash, p_name, p_email, p_role);

    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_deduct_inventory`$$
CREATE PROCEDURE `sp_deduct_inventory`(IN p_order_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_product_id INT;
    DECLARE v_quantity INT;
    DECLARE v_has_recipe INT;

    DECLARE cur CURSOR FOR
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_product_id, v_quantity;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        
        SELECT COUNT(*) INTO v_has_recipe FROM recipes WHERE product_id = v_product_id;
        IF v_has_recipe = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Producto sin receta: no se puede deducir inventario';
        END IF;

        
        UPDATE inventory inv
        JOIN recipes r ON r.inventory_id = inv.id
        SET inv.stock = inv.stock - (r.quantity_per_unit * v_quantity)
        WHERE r.product_id = v_product_id;

    END LOOP read_loop;
    CLOSE cur;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_catalog_group`$$
CREATE PROCEDURE `sp_delete_catalog_group`(IN p_id INT)
BEGIN
    UPDATE catalog_groups SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_catalog_item`$$
CREATE PROCEDURE `sp_delete_catalog_item`(IN p_id INT)
BEGIN
    UPDATE catalog_items SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_inventory_item`$$
CREATE PROCEDURE `sp_delete_inventory_item`(IN p_id INT)
BEGIN
    DECLARE v_recipe_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_recipe_count FROM recipes WHERE inventory_id = p_id;

    IF v_recipe_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede eliminar: el insumo tiene recetas activas';
    ELSE
        DELETE FROM inventory WHERE id = p_id;
        SELECT ROW_COUNT() AS affected;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_order_item`$$
CREATE PROCEDURE `sp_delete_order_item`(IN p_item_id INT)
BEGIN
    DELETE FROM order_items WHERE id = p_item_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_product`$$
CREATE PROCEDURE `sp_delete_product`(IN p_id INT)
BEGIN
    UPDATE products SET active = FALSE WHERE id = p_id AND active = TRUE;
END$$

DROP PROCEDURE IF EXISTS `sp_delete_recipe_item`$$
CREATE PROCEDURE `sp_delete_recipe_item`(IN p_recipe_id INT)
BEGIN
    DELETE FROM recipes WHERE id = p_recipe_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_open_shift`$$
CREATE PROCEDURE `sp_open_shift`(
    IN p_cashier_id INT,
    IN p_start_cash DECIMAL(10,2),
    IN p_station VARCHAR(50)
)
BEGIN
    IF EXISTS (SELECT 1 FROM shifts WHERE status = 'open' AND station = p_station) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ya hay un turno abierto en esta estacion';
    END IF;

    INSERT INTO shifts (cashier_id, start_cash, station)
    VALUES (p_cashier_id, p_start_cash, p_station);

    SELECT LAST_INSERT_ID() AS shift_id;
END$$

DROP PROCEDURE IF EXISTS `sp_recalculate_order_totals`$$
CREATE PROCEDURE `sp_recalculate_order_totals`(IN p_order_id INT)
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
END$$

DROP PROCEDURE IF EXISTS `sp_record_failed_attempt`$$
CREATE PROCEDURE `sp_record_failed_attempt`(IN p_user_id INT)
BEGIN
    UPDATE users
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
            WHEN failed_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
            ELSE locked_until
        END
    WHERE id = p_user_id;
END$$

DROP PROCEDURE IF EXISTS `sp_record_shift_transaction`$$
CREATE PROCEDURE `sp_record_shift_transaction`(
    IN p_shift_id INT,
    IN p_order_id INT,
    IN p_type ENUM('sale', 'refund', 'void'),
    IN p_method ENUM('efectivo', 'tarjeta', 'qr'),
    IN p_amount DECIMAL(10,2)
)
BEGIN
    INSERT INTO shift_transactions (shift_id, order_id, type, method, amount)
    VALUES (p_shift_id, p_order_id, p_type, p_method, p_amount);
END$$

DROP PROCEDURE IF EXISTS `sp_reopen_order`$$
CREATE PROCEDURE `sp_reopen_order`(
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
END$$

DROP PROCEDURE IF EXISTS `sp_reset_failed_attempts`$$
CREATE PROCEDURE `sp_reset_failed_attempts`(IN p_user_id INT)
BEGIN
    UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = p_user_id;
END$$

DROP PROCEDURE IF EXISTS `sp_revoke_all_user_tokens`$$
CREATE PROCEDURE `sp_revoke_all_user_tokens`(IN p_user_id INT)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE, revoked_at = NOW()
    WHERE user_id = p_user_id AND revoked = FALSE;
END$$

DROP PROCEDURE IF EXISTS `sp_revoke_refresh_token`$$
CREATE PROCEDURE `sp_revoke_refresh_token`(
    IN p_token_hash VARCHAR(64),
    IN p_replaced_by VARCHAR(64)
)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_at = NOW(),
        replaced_by = p_replaced_by
    WHERE token_hash = p_token_hash;
END$$

DROP PROCEDURE IF EXISTS `sp_set_product_recipe`$$
CREATE PROCEDURE `sp_set_product_recipe`(
    IN p_product_id INT,
    IN p_items JSON
)
BEGIN
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_valid_count INT DEFAULT 0;

    IF p_items IS NULL OR JSON_LENGTH(p_items) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El producto debe tener al menos un insumo en su receta';
    END IF;

    SET v_items_count = JSON_LENGTH(p_items);

    
    SELECT COUNT(*) INTO v_valid_count
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
        inventory_id INT PATH '$.inventory_id',
        quantity DECIMAL(10,3) PATH '$.quantity'
    )) j
    JOIN inventory i ON i.id = j.inventory_id;

    IF v_valid_count <> v_items_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Uno o mas insumos no existen';
    END IF;

    
    DELETE FROM recipes WHERE product_id = p_product_id;

    INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
    SELECT p_product_id, j.inventory_id, j.quantity, COALESCE(j.unit, i.unit)
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
        inventory_id INT PATH '$.inventory_id',
        quantity DECIMAL(10,3) PATH '$.quantity',
        unit VARCHAR(20) PATH '$.unit'
    )) j
    JOIN inventory i ON i.id = j.inventory_id;

    SELECT p_product_id AS product_id, v_items_count AS recipe_items;
END$$

DROP PROCEDURE IF EXISTS `sp_set_role_permission`$$
CREATE PROCEDURE `sp_set_role_permission`(
    IN p_role VARCHAR(20),
    IN p_module_key VARCHAR(40),
    IN p_allowed BOOLEAN
)
BEGIN
    INSERT INTO role_permissions (role, module_key, allowed)
    VALUES (p_role, p_module_key, p_allowed)
    ON DUPLICATE KEY UPDATE allowed = p_allowed;
END$$

DROP PROCEDURE IF EXISTS `sp_set_user_active`$$
CREATE PROCEDURE `sp_set_user_active`(IN p_id INT, IN p_active BOOLEAN)
BEGIN
    UPDATE users SET active = p_active WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_catalog_group`$$
CREATE PROCEDURE `sp_update_catalog_group`(
    IN p_id INT, IN p_name VARCHAR(100),
    IN p_description TEXT, IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_is_modifier BOOLEAN, IN p_required BOOLEAN, IN p_max_selections INT
)
BEGIN
    UPDATE catalog_groups
    SET name = COALESCE(p_name, name),
        description = p_description,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        is_modifier = p_is_modifier,
        required = p_required,
        max_selections = p_max_selections
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_catalog_item`$$
CREATE PROCEDURE `sp_update_catalog_item`(
    IN p_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_price_adjustment DECIMAL(10,2),
    IN p_capacity INT, IN p_table_id INT
)
BEGIN
    UPDATE catalog_items
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        parent_id = p_parent_id,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        price_adjustment = COALESCE(p_price_adjustment, price_adjustment),
        capacity = COALESCE(p_capacity, capacity),
        table_id = p_table_id
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_inventory_item`$$
CREATE PROCEDURE `sp_update_inventory_item`(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_unit VARCHAR(20),
    IN p_min_stock DECIMAL(10,3),
    IN p_cost_per_unit DECIMAL(10,2),
    IN p_supplier_id INT
)
BEGIN
    UPDATE inventory
    SET name = p_name,
        unit = p_unit,
        min_stock = p_min_stock,
        cost_per_unit = p_cost_per_unit,
        supplier_id = p_supplier_id
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_product`$$
CREATE PROCEDURE `sp_update_product`(
    IN p_id INT,
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255),
    IN p_sort_order INT,
    IN p_active BOOLEAN
)
BEGIN
    UPDATE products
    SET name = p_name, category_id = p_category_id, price = p_price,
        cost = p_cost, description = p_description, badge = p_badge,
        image = p_image, sort_order = p_sort_order, active = p_active
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_setting`$$
CREATE PROCEDURE `sp_update_setting`(
    IN p_key VARCHAR(64),
    IN p_value VARCHAR(255)
)
BEGIN
    INSERT INTO settings (setting_key, setting_value)
    VALUES (p_key, p_value)
    ON DUPLICATE KEY UPDATE setting_value = p_value;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_stock`$$
CREATE PROCEDURE `sp_update_stock`(IN p_inventory_id INT, IN p_new_stock DECIMAL(10,3))
BEGIN
    UPDATE inventory SET stock = p_new_stock WHERE id = p_inventory_id;
    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_update_supplier`$$
CREATE PROCEDURE `sp_update_supplier`(
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
END$$

DROP PROCEDURE IF EXISTS `sp_update_user`$$
CREATE PROCEDURE `sp_update_user`(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero'),
    IN p_active BOOLEAN
)
BEGIN
    UPDATE users
    SET name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        role = COALESCE(p_role, role),
        active = COALESCE(p_active, active)
    WHERE id = p_id;

    SELECT ROW_COUNT() AS affected;
END$$

DROP PROCEDURE IF EXISTS `sp_upsert_recipe_item`$$
CREATE PROCEDURE `sp_upsert_recipe_item`(
    IN p_product_id INT,
    IN p_inventory_id INT,
    IN p_quantity_per_unit DECIMAL(10,3),
    IN p_unit VARCHAR(20)
)
BEGIN
    INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
    VALUES (p_product_id, p_inventory_id, p_quantity_per_unit, p_unit)
    ON DUPLICATE KEY UPDATE
        quantity_per_unit = p_quantity_per_unit,
        unit = p_unit;
    SELECT LAST_INSERT_ID() AS id;
END$$

DROP PROCEDURE IF EXISTS `sp_void_order`$$
CREATE PROCEDURE `sp_void_order`(IN p_order_id INT, IN p_user_id INT)
BEGIN
    UPDATE orders
    SET status = 'anulada', voided_at = CURRENT_TIMESTAMP, voided_by = p_user_id
    WHERE id = p_order_id AND status NOT IN ('pagada', 'anulada');
    SELECT ROW_COUNT() AS affected;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
