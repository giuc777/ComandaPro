-- ============================================
-- FASE 6: Procedimientos de Pagos
-- ============================================

-- Registrar pago (manual) de una orden pausada
DROP PROCEDURE IF EXISTS sp_record_payment;
DELIMITER //
CREATE PROCEDURE sp_record_payment(
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

    -- Validar estado de la orden
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

    -- Monto a cobrar: con IVA (total) o sin IVA (subtotal)
    IF p_apply_tax = FALSE THEN
        SET v_amount = v_subtotal;
    ELSE
        SET v_amount = v_total;
    END IF;

    -- Calcular cambio (solo efectivo)
    IF p_method = 'efectivo' AND p_amount_given IS NOT NULL THEN
        SET v_change = p_amount_given - v_amount;
    END IF;

    -- Insertar pago
    INSERT INTO payments (order_id, method, amount, amount_given, change_amount, cashier_id, sat_invoice)
    VALUES (p_order_id, p_method, v_amount, p_amount_given, v_change, p_cashier_id, p_sat_invoice);

    -- Actualizar orden a pagada (y ajustar IVA si no se aplico)
    IF p_apply_tax = FALSE THEN
        UPDATE orders SET status = 'pagada', tax = 0, total = subtotal WHERE id = p_order_id;
    ELSE
        UPDATE orders SET status = 'pagada' WHERE id = p_order_id;
    END IF;

    -- Liberar mesa (queda sucia para limpieza)
    UPDATE tables SET status = 'dirty', current_order_id = NULL
    WHERE current_order_id = p_order_id;

    SELECT LAST_INSERT_ID() AS payment_id, v_change AS change_amount, v_amount AS amount;
END //
DELIMITER ;

-- Obtener pago por ID
DROP PROCEDURE IF EXISTS sp_get_payment_by_id;
DELIMITER //
CREATE PROCEDURE sp_get_payment_by_id(IN p_payment_id INT)
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
END //
DELIMITER ;

-- Obtener pagos del dia
DROP PROCEDURE IF EXISTS sp_get_daily_payments;
DELIMITER //
CREATE PROCEDURE sp_get_daily_payments(IN p_date DATE)
BEGIN
    SELECT p.id, p.order_id, o.customer_name, p.method, p.amount,
           p.amount_given, p.change_amount, u.name AS cashier_name,
           p.sat_invoice, p.created_at
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE DATE(p.created_at) = p_date
    ORDER BY p.created_at DESC;
END //
DELIMITER ;

-- Resumen de ventas del dia
DROP PROCEDURE IF EXISTS sp_get_daily_sales_summary;
DELIMITER //
CREATE PROCEDURE sp_get_daily_sales_summary(IN p_date DATE)
BEGIN
    SELECT
        IFNULL(SUM(amount), 0) AS total_sales,
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_sales,
        IFNULL(SUM(CASE WHEN method = 'tarjeta'  THEN amount ELSE 0 END), 0) AS card_sales,
        IFNULL(SUM(CASE WHEN method = 'qr'       THEN amount ELSE 0 END), 0) AS qr_sales,
        COUNT(*) AS transaction_count
    FROM payments
    WHERE DATE(created_at) = p_date;
END //
DELIMITER ;
