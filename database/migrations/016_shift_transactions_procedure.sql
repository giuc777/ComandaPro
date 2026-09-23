-- ============================================
-- FASE 10: Listado de transacciones por turno
-- Expone el detalle de cada movimiento (venta/refund/void)
-- ligado a un turno, con datos de la orden y del pago.
-- ============================================

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
