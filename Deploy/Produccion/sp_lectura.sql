-- ============================================
-- DeerCoffee / ComandaPro - sp_lectura.sql
-- Procedimientos de SOLO LECTURA (unicamente consultan datos)
-- Total: 47 procedimientos
-- ============================================
USE `comandapro`;

SET FOREIGN_KEY_CHECKS = 0;

DELIMITER $$

DROP PROCEDURE IF EXISTS `sp_calculate_item_price`$$
CREATE PROCEDURE `sp_calculate_item_price`(
    IN p_product_id INT,
    IN p_modifier_ids JSON
)
BEGIN
    DECLARE v_base_price DECIMAL(10,2);
    DECLARE v_modifier_total DECIMAL(10,2) DEFAULT 0;

    SELECT price INTO v_base_price FROM products WHERE id = p_product_id;

    IF p_modifier_ids IS NOT NULL AND JSON_LENGTH(p_modifier_ids) > 0 THEN
        SELECT IFNULL(SUM(ci.price_adjustment), 0) INTO v_modifier_total
        FROM catalog_items ci
        WHERE ci.id IN (
            SELECT CAST(j.val AS UNSIGNED)
            FROM JSON_TABLE(p_modifier_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        ) AND ci.active = TRUE;
    END IF;

    SELECT v_base_price AS base_price, v_modifier_total AS modifier_total,
           (v_base_price + v_modifier_total) AS final_price;
END$$

DROP PROCEDURE IF EXISTS `sp_check_catalog_slug_unique`$$
CREATE PROCEDURE `sp_check_catalog_slug_unique`(
    IN p_slug VARCHAR(50), IN p_exclude_id INT
)
BEGIN
    SELECT COUNT(*) AS cnt FROM catalog_groups
    WHERE slug = p_slug AND (p_exclude_id IS NULL OR id != p_exclude_id);
END$$

DROP PROCEDURE IF EXISTS `sp_count_products_by_category`$$
CREATE PROCEDURE `sp_count_products_by_category`()
BEGIN
    SELECT category_id, COUNT(*) AS product_count
    FROM products
    WHERE active = TRUE AND category_id IS NOT NULL
    GROUP BY category_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_arqueo_breakdown`$$
CREATE PROCEDURE `sp_get_arqueo_breakdown`(IN p_shift_id INT)
BEGIN
    SELECT
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_total,
        IFNULL(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) AS card_total,
        IFNULL(SUM(CASE WHEN method = 'qr' THEN amount ELSE 0 END), 0) AS qr_total,
        COUNT(*) AS transaction_count
    FROM shift_transactions
    WHERE shift_id = p_shift_id AND type = 'sale';
END$$

DROP PROCEDURE IF EXISTS `sp_get_cash_closing`$$
CREATE PROCEDURE `sp_get_cash_closing`(IN p_shift_id INT)
BEGIN
    SELECT s.id, s.station, s.status, s.start_time, s.close_time,
           u.name AS cashier_name,
           s.start_cash, s.expected_cash, s.actual_cash, s.difference,
           IFNULL(s.total_sales, 0) AS total_sales,
           IFNULL(s.cash_sales, 0) AS cash_sales,
           IFNULL(s.card_sales, 0) AS card_sales,
           IFNULL(s.qr_sales, 0) AS qr_sales,
           IFNULL(s.transaction_count, 0) AS transaction_count
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.id = p_shift_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_catalog_group`$$
CREATE PROCEDURE `sp_get_catalog_group`(IN p_id INT)
BEGIN
    SELECT id, name, slug, description, sort_order, active,
           is_modifier, required, max_selections,
           created_at, updated_at
    FROM catalog_groups WHERE id = p_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_catalog_item`$$
CREATE PROCEDURE `sp_get_catalog_item`(IN p_id INT)
BEGIN
    SELECT id, group_id, name, description, icon, color, parent_id,
           sort_order, price_adjustment, capacity, table_id,
           active, created_at, updated_at
    FROM catalog_items WHERE id = p_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_category_sales`$$
CREATE PROCEDURE `sp_get_category_sales`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT COALESCE(ci.name, p.category, 'Sin categoria') AS category_name,
           SUM(oi.quantity) AS items_sold,
           SUM(oi.quantity * oi.unit_price) AS total_revenue,
           COUNT(DISTINCT oi.order_id) AS order_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN catalog_items ci ON p.category_id = ci.id
    WHERE o.status = 'pagada'
      AND DATE(o.created_at) >= p_start_date
      AND DATE(o.created_at) <= p_end_date
    GROUP BY category_name
    ORDER BY total_revenue DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_get_current_shift`$$
CREATE PROCEDURE `sp_get_current_shift`()
BEGIN
    SELECT s.id, s.cashier_id, u.name AS cashier_name, s.station,
           s.start_time, s.start_cash, s.status,
           IFNULL((SELECT SUM(CASE WHEN st.method = 'efectivo' THEN st.amount ELSE 0 END)
                   FROM shift_transactions st WHERE st.shift_id = s.id AND st.type = 'sale'), 0) AS cash_sales,
           IFNULL((SELECT SUM(CASE WHEN st.method = 'tarjeta' THEN st.amount ELSE 0 END)
                   FROM shift_transactions st WHERE st.shift_id = s.id AND st.type = 'sale'), 0) AS card_sales,
           IFNULL((SELECT SUM(CASE WHEN st.method = 'qr' THEN st.amount ELSE 0 END)
                   FROM shift_transactions st WHERE st.shift_id = s.id AND st.type = 'sale'), 0) AS qr_sales,
           (SELECT COUNT(*) FROM shift_transactions WHERE shift_id = s.id AND type = 'sale') AS transaction_count
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'open'
    ORDER BY s.start_time DESC
    LIMIT 1;
END$$

DROP PROCEDURE IF EXISTS `sp_get_daily_payments`$$
CREATE PROCEDURE `sp_get_daily_payments`(IN p_date DATE)
BEGIN
    SELECT p.id, p.order_id, o.customer_name, p.method, p.amount,
           p.amount_given, p.change_amount, u.name AS cashier_name,
           p.sat_invoice, p.created_at
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE DATE(p.created_at) = p_date
    ORDER BY p.created_at DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_get_daily_sales_summary`$$
CREATE PROCEDURE `sp_get_daily_sales_summary`(IN p_date DATE)
BEGIN
    SELECT
        IFNULL(SUM(amount), 0) AS total_sales,
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_sales,
        IFNULL(SUM(CASE WHEN method = 'tarjeta'  THEN amount ELSE 0 END), 0) AS card_sales,
        IFNULL(SUM(CASE WHEN method = 'qr'       THEN amount ELSE 0 END), 0) AS qr_sales,
        COUNT(*) AS transaction_count
    FROM payments
    WHERE DATE(created_at) = p_date;
END$$

DROP PROCEDURE IF EXISTS `sp_get_dashboard_summary`$$
CREATE PROCEDURE `sp_get_dashboard_summary`()
BEGIN
    SELECT
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE DATE(created_at) = CURDATE()) AS today_sales,
        (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = CURDATE()) AS today_transactions,
        (SELECT COUNT(*) FROM orders WHERE status = 'pausada') AS pending_orders,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE() AND status = 'pagada') AS today_orders,
        (SELECT COUNT(*) FROM inventory WHERE stock <= min_stock) AS low_stock_count,
        (SELECT IFNULL(AVG(amount), 0) FROM payments WHERE DATE(created_at) = CURDATE()) AS avg_ticket;
END$$

DROP PROCEDURE IF EXISTS `sp_get_hourly_sales`$$
CREATE PROCEDURE `sp_get_hourly_sales`(IN p_date DATE)
BEGIN
    SELECT HOUR(created_at) AS sale_hour,
           COUNT(*) AS transaction_count,
           IFNULL(SUM(amount), 0) AS total_sales
    FROM payments
    WHERE DATE(created_at) = p_date
    GROUP BY HOUR(created_at)
    ORDER BY sale_hour;
END$$

DROP PROCEDURE IF EXISTS `sp_get_inventory_item`$$
CREATE PROCEDURE `sp_get_inventory_item`(IN p_id INT)
BEGIN
    SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
           i.cost_per_unit, i.supplier_id, s.name AS supplier_name,
           ci.name AS catalog_item_name,
           CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
    FROM inventory i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN catalog_items ci ON i.catalog_item_id = ci.id
    WHERE i.id = p_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_order`$$
CREATE PROCEDURE `sp_get_order`(IN p_order_id INT)
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
END$$

DROP PROCEDURE IF EXISTS `sp_get_payment_by_id`$$
CREATE PROCEDURE `sp_get_payment_by_id`(IN p_payment_id INT)
BEGIN
    SELECT p.id, p.order_id, o.customer_name, o.table_id, t.name AS table_name,
           o.subtotal, o.tax, o.total,
           p.method, p.amount, p.amount_given, p.change_amount,
           u.name AS cashier_name, p.sat_invoice, p.created_at
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE p.id = p_payment_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_period_comparison`$$
CREATE PROCEDURE `sp_get_period_comparison`(IN p_date DATE)
BEGIN
    SELECT
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE DATE(created_at) = p_date) AS today_sales,
        (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = p_date) AS today_transactions,
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE DATE(created_at) = DATE_SUB(p_date, INTERVAL 1 DAY)) AS yesterday_sales,
        (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = DATE_SUB(p_date, INTERVAL 1 DAY)) AS yesterday_transactions,
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE YEARWEEK(created_at, 1) = YEARWEEK(p_date, 1)) AS week_sales,
        (SELECT COUNT(*) FROM payments WHERE YEARWEEK(created_at, 1) = YEARWEEK(p_date, 1)) AS week_transactions,
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(p_date, INTERVAL 7 DAY), 1)) AS last_week_sales,
        (SELECT COUNT(*) FROM payments WHERE YEARWEEK(created_at, 1) = YEARWEEK(DATE_SUB(p_date, INTERVAL 7 DAY), 1)) AS last_week_transactions;
END$$

DROP PROCEDURE IF EXISTS `sp_get_permissions_for_role`$$
CREATE PROCEDURE `sp_get_permissions_for_role`(IN p_role VARCHAR(20))
BEGIN
    SELECT module_key, allowed
    FROM role_permissions
    WHERE role = p_role;
END$$

DROP PROCEDURE IF EXISTS `sp_get_product`$$
CREATE PROCEDURE `sp_get_product`(IN p_id INT)
BEGIN
    SELECT p.id, p.name, p.category_id, ci.name AS category_name,
           p.price, p.cost, p.description, p.badge, p.image,
           p.sort_order, p.active
    FROM products p
    LEFT JOIN catalog_items ci ON p.category_id = ci.id
    WHERE p.id = p_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_product_modifiers`$$
CREATE PROCEDURE `sp_get_product_modifiers`(IN p_product_id INT)
BEGIN
    SELECT cg.id AS group_id, cg.name AS group_name, cg.required, cg.max_selections,
           ci.id AS option_id, ci.name AS option_name, ci.price_adjustment
    FROM product_modifier_groups pmg
    JOIN catalog_groups cg ON pmg.group_id = cg.id
    LEFT JOIN catalog_items ci ON cg.id = ci.group_id AND ci.active = TRUE
    WHERE pmg.product_id = p_product_id AND cg.active = TRUE AND cg.is_modifier = TRUE
    ORDER BY cg.sort_order, ci.sort_order;
END$$

DROP PROCEDURE IF EXISTS `sp_get_product_ranking`$$
CREATE PROCEDURE `sp_get_product_ranking`(
    IN p_start_date DATE,
    IN p_end_date DATE,
    IN p_limit INT
)
BEGIN
    SELECT p.id AS product_id,
           p.name AS product_name,
           COALESCE(ci.name, p.category, 'Sin categoria') AS category_name,
           SUM(oi.quantity) AS total_sold,
           SUM(oi.quantity * oi.unit_price) AS total_revenue,
           COUNT(DISTINCT oi.order_id) AS order_count
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN catalog_items ci ON p.category_id = ci.id
    WHERE o.status = 'pagada'
      AND DATE(o.created_at) >= p_start_date
      AND DATE(o.created_at) <= p_end_date
    GROUP BY p.id, p.name, ci.name, p.category
    ORDER BY total_sold DESC
    LIMIT p_limit;
END$$

DROP PROCEDURE IF EXISTS `sp_get_product_recipe`$$
CREATE PROCEDURE `sp_get_product_recipe`(IN p_product_id INT)
BEGIN
    SELECT r.id, r.inventory_id, i.name AS ingredient_name,
           i.unit AS ingredient_unit, r.quantity_per_unit, i.stock,
           i.cost_per_unit,
           (r.quantity_per_unit * i.cost_per_unit) AS line_cost
    FROM recipes r
    JOIN inventory i ON r.inventory_id = i.id
    WHERE r.product_id = p_product_id
    ORDER BY i.name;
END$$

DROP PROCEDURE IF EXISTS `sp_get_purchase_order`$$
CREATE PROCEDURE `sp_get_purchase_order`(IN p_po_id INT)
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
END$$

DROP PROCEDURE IF EXISTS `sp_get_role_permissions`$$
CREATE PROCEDURE `sp_get_role_permissions`()
BEGIN
    SELECT role, module_key, allowed
    FROM role_permissions
    ORDER BY role, module_key;
END$$

DROP PROCEDURE IF EXISTS `sp_get_sales_summary_range`$$
CREATE PROCEDURE `sp_get_sales_summary_range`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT
        IFNULL(SUM(amount), 0) AS total_sales,
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_sales,
        IFNULL(SUM(CASE WHEN method = 'tarjeta'  THEN amount ELSE 0 END), 0) AS card_sales,
        IFNULL(SUM(CASE WHEN method = 'qr'       THEN amount ELSE 0 END), 0) AS qr_sales,
        COUNT(*) AS transaction_count
    FROM payments
    WHERE DATE(created_at) >= p_start_date
      AND DATE(created_at) <= p_end_date;
END$$

DROP PROCEDURE IF EXISTS `sp_get_sales_trend`$$
CREATE PROCEDURE `sp_get_sales_trend`(
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    SELECT DATE(created_at) AS sale_date,
           COUNT(*) AS transaction_count,
           IFNULL(SUM(amount), 0) AS total_sales
    FROM payments
    WHERE DATE(created_at) >= p_start_date
      AND DATE(created_at) <= p_end_date
    GROUP BY DATE(created_at)
    ORDER BY sale_date;
END$$

DROP PROCEDURE IF EXISTS `sp_get_settings`$$
CREATE PROCEDURE `sp_get_settings`()
BEGIN
    SELECT setting_key, setting_value FROM settings;
END$$

DROP PROCEDURE IF EXISTS `sp_get_shift_history`$$
CREATE PROCEDURE `sp_get_shift_history`(IN p_limit INT)
BEGIN
    SELECT s.id, s.cashier_id, u.name AS cashier_name, s.station,
           s.start_time, s.close_time, s.start_cash, s.expected_cash,
           s.actual_cash, s.difference, s.total_sales, s.cash_sales,
           s.card_sales, s.qr_sales, s.transaction_count
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'closed'
    ORDER BY s.close_time DESC
    LIMIT p_limit;
END$$

DROP PROCEDURE IF EXISTS `sp_get_shift_transactions`$$
CREATE PROCEDURE `sp_get_shift_transactions`(IN p_shift_id INT)
BEGIN
    SELECT st.id, st.order_id, st.type, st.method, st.amount, st.created_at,
           o.customer_name, o.mode, o.table_id, t.name AS table_name,
           p.id AS payment_id, p.amount_given, p.change_amount,
           u.name AS cashier_name,
           (SELECT IFNULL(SUM(oi.quantity), 0)
            FROM order_items oi WHERE oi.order_id = st.order_id) AS item_count
    FROM shift_transactions st
    LEFT JOIN orders o ON st.order_id = o.id
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN payments p ON p.id = (
        SELECT p2.id FROM payments p2
        WHERE p2.order_id = st.order_id
        ORDER BY p2.id DESC LIMIT 1
    )
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE st.shift_id = p_shift_id
    ORDER BY st.created_at DESC, st.id DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_get_supplier_detail`$$
CREATE PROCEDURE `sp_get_supplier_detail`(IN p_supplier_id INT)
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
END$$

DROP PROCEDURE IF EXISTS `sp_get_user_by_id`$$
CREATE PROCEDURE `sp_get_user_by_id`(IN p_id INT)
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal, active
    FROM users WHERE id = p_id;
END$$

DROP PROCEDURE IF EXISTS `sp_get_user_by_username`$$
CREATE PROCEDURE `sp_get_user_by_username`(IN p_username VARCHAR(50))
BEGIN
    SELECT id, username, password_hash, name, email, role, avatar,
           sucursal, active, failed_attempts, locked_until
    FROM users
    WHERE username = p_username;
END$$

DROP PROCEDURE IF EXISTS `sp_is_jti_blacklisted`$$
CREATE PROCEDURE `sp_is_jti_blacklisted`(IN p_jti VARCHAR(50))
BEGIN
    SELECT COUNT(*) AS is_blacklisted
    FROM token_blacklist
    WHERE jti = p_jti AND expires_at > NOW();
END$$

DROP PROCEDURE IF EXISTS `sp_list_all_suppliers`$$
CREATE PROCEDURE `sp_list_all_suppliers`()
BEGIN
    SELECT id, name, contact_name, phone, email, address, status, created_at
    FROM suppliers
    ORDER BY status DESC, name;
END$$

DROP PROCEDURE IF EXISTS `sp_list_catalog_groups`$$
CREATE PROCEDURE `sp_list_catalog_groups`()
BEGIN
    SELECT cg.id, cg.name, cg.slug, cg.description, cg.sort_order,
           cg.active, cg.is_modifier, cg.required, cg.max_selections,
           cg.created_at, cg.updated_at,
           COUNT(ci.id) AS item_count
    FROM catalog_groups cg
    LEFT JOIN catalog_items ci ON ci.group_id = cg.id AND ci.active = TRUE
    WHERE cg.active = TRUE
    GROUP BY cg.id
    ORDER BY cg.sort_order, cg.name;
END$$

DROP PROCEDURE IF EXISTS `sp_list_catalog_items_by_group`$$
CREATE PROCEDURE `sp_list_catalog_items_by_group`(IN p_slug VARCHAR(50))
BEGIN
    SELECT ci.id, ci.group_id, ci.name, ci.description, ci.icon, ci.color,
           ci.parent_id, ci.sort_order, ci.price_adjustment,
           ci.capacity, ci.table_id,
           ci.active, ci.created_at, ci.updated_at,
           ci2.name AS parent_name,
           t.status AS table_status, t.current_order_id
    FROM catalog_items ci
    INNER JOIN catalog_groups cg ON ci.group_id = cg.id
    LEFT JOIN catalog_items ci2 ON ci.parent_id = ci2.id
    LEFT JOIN tables t ON ci.table_id = t.id
    WHERE cg.slug = p_slug AND ci.active = TRUE AND cg.active = TRUE
    ORDER BY ci.sort_order, ci.name;
END$$

DROP PROCEDURE IF EXISTS `sp_list_inventory`$$
CREATE PROCEDURE `sp_list_inventory`(IN p_low_stock_only BOOLEAN)
BEGIN
    IF p_low_stock_only = TRUE THEN
        SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
               i.cost_per_unit, s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.stock <= i.min_stock
        ORDER BY i.name;
    ELSE
        SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
               i.cost_per_unit, s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.name;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_list_orders_by_status`$$
CREATE PROCEDURE `sp_list_orders_by_status`(IN p_status ENUM('pausada','pagada','anulada','enviada','preparando','lista','completada'))
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
END$$

DROP PROCEDURE IF EXISTS `sp_list_parked_orders`$$
CREATE PROCEDURE `sp_list_parked_orders`()
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
END$$

DROP PROCEDURE IF EXISTS `sp_list_products`$$
CREATE PROCEDURE `sp_list_products`(IN p_category_id INT)
BEGIN
    IF p_category_id IS NULL THEN
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active,
               (SELECT COUNT(*) FROM recipes r WHERE r.product_id = p.id) AS recipe_count
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.active = TRUE
        ORDER BY p.sort_order, p.name;
    ELSE
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active,
               (SELECT COUNT(*) FROM recipes r WHERE r.product_id = p.id) AS recipe_count
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.category_id = p_category_id AND p.active = TRUE
        ORDER BY p.sort_order, p.name;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_list_purchase_orders`$$
CREATE PROCEDURE `sp_list_purchase_orders`(
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
END$$

DROP PROCEDURE IF EXISTS `sp_list_suppliers`$$
CREATE PROCEDURE `sp_list_suppliers`()
BEGIN
    SELECT id, name, contact_name, phone, email, address, status, created_at
    FROM suppliers
    WHERE status = 'Activo'
    ORDER BY name;
END$$

DROP PROCEDURE IF EXISTS `sp_list_tables`$$
CREATE PROCEDURE `sp_list_tables`()
BEGIN
    SELECT id, name, capacity, status, current_order_id
    FROM tables
    ORDER BY id;
END$$

DROP PROCEDURE IF EXISTS `sp_list_users`$$
CREATE PROCEDURE `sp_list_users`()
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal, active, created_at
    FROM users
    WHERE active = TRUE
    ORDER BY name;
END$$

DROP PROCEDURE IF EXISTS `sp_list_users_admin`$$
CREATE PROCEDURE `sp_list_users_admin`()
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal,
           active, failed_attempts, locked_until, created_at,
           CASE WHEN locked_until IS NOT NULL AND locked_until > NOW()
                THEN 1 ELSE 0 END AS is_locked
    FROM users
    ORDER BY active DESC, name;
END$$

DROP PROCEDURE IF EXISTS `sp_product_recipe_cost`$$
CREATE PROCEDURE `sp_product_recipe_cost`(IN p_product_id INT)
BEGIN
    SELECT p.id, p.name, p.cost AS stated_cost,
           COALESCE(SUM(r.quantity_per_unit * i.cost_per_unit), 0) AS recipe_cost
    FROM products p
    LEFT JOIN recipes r ON r.product_id = p.id
    LEFT JOIN inventory i ON r.inventory_id = i.id
    WHERE p.id = p_product_id
    GROUP BY p.id, p.name, p.cost;
END$$

DROP PROCEDURE IF EXISTS `sp_validate_refresh_token`$$
CREATE PROCEDURE `sp_validate_refresh_token`(IN p_token_hash VARCHAR(64))
BEGIN
    SELECT rt.id, rt.user_id, rt.expires_at,
           u.username, u.name, u.role, u.email, u.avatar, u.sucursal
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = p_token_hash
      AND rt.revoked = FALSE
      AND rt.expires_at > NOW()
      AND u.active = TRUE;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;
