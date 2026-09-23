-- ============================================
-- FASE 10: Procedimientos de Turnos
-- ============================================

-- Abrir turno
DROP PROCEDURE IF EXISTS sp_open_shift;
DELIMITER //
CREATE PROCEDURE sp_open_shift(
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
END //
DELIMITER ;

-- Cerrar turno
DROP PROCEDURE IF EXISTS sp_close_shift;
DELIMITER //
CREATE PROCEDURE sp_close_shift(
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

    -- Calcular efectivo esperado = efectivo inicial + ventas en efectivo
    SELECT IFNULL(v_start_cash + SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), v_start_cash)
    INTO v_expected_cash
    FROM shift_transactions
    WHERE shift_id = p_shift_id AND type = 'sale';

    SET v_difference = p_actual_cash - v_expected_cash;

    -- Obtener totales por metodo
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
END //
DELIMITER ;

-- Registrar transaccion de turno
DROP PROCEDURE IF EXISTS sp_record_shift_transaction;
DELIMITER //
CREATE PROCEDURE sp_record_shift_transaction(
    IN p_shift_id INT,
    IN p_order_id INT,
    IN p_type ENUM('sale', 'refund', 'void'),
    IN p_method ENUM('efectivo', 'tarjeta', 'qr'),
    IN p_amount DECIMAL(10,2)
)
BEGIN
    INSERT INTO shift_transactions (shift_id, order_id, type, method, amount)
    VALUES (p_shift_id, p_order_id, p_type, p_method, p_amount);
END //
DELIMITER ;

-- Obtener turno actual abierto
DROP PROCEDURE IF EXISTS sp_get_current_shift;
DELIMITER //
CREATE PROCEDURE sp_get_current_shift()
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
END //
DELIMITER ;

-- Historial de turnos
DROP PROCEDURE IF EXISTS sp_get_shift_history;
DELIMITER //
CREATE PROCEDURE sp_get_shift_history(IN p_limit INT)
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
END //
DELIMITER ;

-- Arqueo: desglose por metodo
DROP PROCEDURE IF EXISTS sp_get_arqueo_breakdown;
DELIMITER //
CREATE PROCEDURE sp_get_arqueo_breakdown(IN p_shift_id INT)
BEGIN
    SELECT
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_total,
        IFNULL(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) AS card_total,
        IFNULL(SUM(CASE WHEN method = 'qr' THEN amount ELSE 0 END), 0) AS qr_total,
        COUNT(*) AS transaction_count
    FROM shift_transactions
    WHERE shift_id = p_shift_id AND type = 'sale';
END //
DELIMITER ;

-- Listado de transacciones de un turno (una fila por movimiento)
DROP PROCEDURE IF EXISTS sp_get_shift_transactions;
DELIMITER //
CREATE PROCEDURE sp_get_shift_transactions(IN p_shift_id INT)
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
END //
DELIMITER ;
