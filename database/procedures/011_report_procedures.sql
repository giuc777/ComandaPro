-- ============================================
-- FASE 11: Procedimientos de Reportes y Analiticas
-- ============================================
USE comandapro;

-- ============================================
-- Resumen de ventas por rango de fechas
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_sales_summary_range;
DELIMITER //
CREATE PROCEDURE sp_get_sales_summary_range(
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
END //
DELIMITER ;

-- ============================================
-- Ranking de productos mas vendidos
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_product_ranking;
DELIMITER //
CREATE PROCEDURE sp_get_product_ranking(
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
END //
DELIMITER ;

-- ============================================
-- Ventas por hora (del dia)
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_hourly_sales;
DELIMITER //
CREATE PROCEDURE sp_get_hourly_sales(IN p_date DATE)
BEGIN
    SELECT HOUR(created_at) AS sale_hour,
           COUNT(*) AS transaction_count,
           IFNULL(SUM(amount), 0) AS total_sales
    FROM payments
    WHERE DATE(created_at) = p_date
    GROUP BY HOUR(created_at)
    ORDER BY sale_hour;
END //
DELIMITER ;

-- ============================================
-- Ventas por categoria
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_category_sales;
DELIMITER //
CREATE PROCEDURE sp_get_category_sales(
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
END //
DELIMITER ;

-- ============================================
-- Tendencia de ventas por dia (rango)
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_sales_trend;
DELIMITER //
CREATE PROCEDURE sp_get_sales_trend(
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
END //
DELIMITER ;

-- ============================================
-- Comparativa de periodos (hoy vs ayer / semana vs semana)
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_period_comparison;
DELIMITER //
CREATE PROCEDURE sp_get_period_comparison(IN p_date DATE)
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
END //
DELIMITER ;

-- ============================================
-- Resumen para el Dashboard
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_dashboard_summary;
DELIMITER //
CREATE PROCEDURE sp_get_dashboard_summary()
BEGIN
    SELECT
        (SELECT IFNULL(SUM(amount), 0) FROM payments WHERE DATE(created_at) = CURDATE()) AS today_sales,
        (SELECT COUNT(*) FROM payments WHERE DATE(created_at) = CURDATE()) AS today_transactions,
        (SELECT COUNT(*) FROM orders WHERE status IN ('pausada','enviada','preparando','lista')) AS pending_orders,
        (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE() AND status = 'pagada') AS today_orders,
        (SELECT COUNT(*) FROM inventory WHERE stock <= min_stock) AS low_stock_count,
        (SELECT IFNULL(AVG(amount), 0) FROM payments WHERE DATE(created_at) = CURDATE()) AS avg_ticket;
END //
DELIMITER ;

-- ============================================
-- Reporte de cierre de caja por turno (resumen completo)
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_cash_closing;
DELIMITER //
CREATE PROCEDURE sp_get_cash_closing(IN p_shift_id INT)
BEGIN
    SELECT s.id, s.station, s.status, s.start_time, s.close_time,
           u.name AS cashier_name,
           s.start_cash, s.expected_cash, s.actual_cash, s.difference,
           IFNULL(s.total_sales, 0) AS total_sales,
           IFNULL(s.cash_sales, 0) AS cash_sales,
           IFNULL(s.card_sales, 0) AS card_sales,
           IFNULL(s.qr_sales, 0) AS qr_sales,
           IFNULL(s.transaction_count, 0) AS transaction_count,
           (SELECT IFNULL(SUM(st.amount), 0) FROM shift_transactions st
            WHERE st.shift_id = s.id AND st.type = 'income') AS income_total,
           (SELECT IFNULL(SUM(st.amount), 0) FROM shift_transactions st
            WHERE st.shift_id = s.id AND st.type = 'expense') AS expense_total
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.id = p_shift_id;
END //
DELIMITER ;

-- ============================================
-- FASE 05: Listado de la cocina (KDS)
-- Una fila por item; el controller agrupa por order_id.
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_kds_orders;
DELIMITER //
CREATE PROCEDURE sp_get_kds_orders(IN p_status VARCHAR(20))
BEGIN
    SELECT o.id AS order_id,
           o.status, o.mode, o.customer_name,
           t.name AS table_name,
           u.name AS created_by_name,
           o.created_at, o.sent_at, o.started_at, o.ready_at,
           TIMESTAMPDIFF(MINUTE, o.sent_at, NOW()) AS minutes_waiting,
           oi.id AS item_id,
           oi.product_id, p.name AS product_name,
           oi.quantity, oi.modifier_labels, oi.notes,
           oi.sent, oi.prepared_at
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status IN ('enviada', 'preparando', 'lista')
      AND (p_status IS NULL OR p_status = '' OR o.status = p_status)
    ORDER BY o.sent_at ASC, oi.id ASC;
END //
DELIMITER ;

-- ============================================
-- FASE 15: Listado de ordenes del administrador
-- Una fila por item; el controller agrupa por order_id.
-- ============================================
DROP PROCEDURE IF EXISTS sp_get_orders_admin;
DELIMITER //
CREATE PROCEDURE sp_get_orders_admin(IN p_status VARCHAR(20), IN p_limit INT)
BEGIN
    DECLARE v_limit INT DEFAULT 50;

    IF p_limit IS NOT NULL AND p_limit > 0 THEN
        SET v_limit = p_limit;
    END IF;

    SELECT o.id AS order_id,
           o.status, o.mode, o.customer_name,
           t.name AS table_name,
           u.name AS created_by_name,
           o.subtotal, o.tax, o.total,
           o.created_at, o.updated_at,
           o.parked_at, o.sent_at, o.started_at, o.ready_at, o.completed_at,
           o.voided_at,
           TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS minutes_open,
           oi.id AS item_id,
           oi.product_id, p.name AS product_name,
           oi.quantity, oi.unit_price, oi.modifier_labels, oi.notes,
           oi.sent, oi.prepared_at
    FROM (
        SELECT o2.id
        FROM orders o2
        WHERE CASE
                WHEN p_status IS NULL OR p_status = '' THEN
                    o2.status IN ('pausada', 'enviada', 'preparando', 'lista', 'completada')
                ELSE o2.status = p_status
              END
        ORDER BY o2.id DESC
        LIMIT v_limit
    ) ids
    JOIN orders o ON o.id = ids.id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    ORDER BY o.id DESC, oi.id ASC;
END //
DELIMITER ;
