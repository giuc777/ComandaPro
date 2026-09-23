-- ============================================
-- FASE 10: Backfill de ventas a turnos
-- Liga retroactivamente los pagos que cayeron dentro
-- de la ventana de cada turno y que no quedaron en
-- shift_transactions (por el antiguo linkage best-effort).
-- ============================================

INSERT INTO shift_transactions (shift_id, order_id, type, method, amount, created_at)
SELECT s.id, p.order_id, 'sale', p.method, p.amount, p.created_at
FROM payments p
JOIN shifts s
    ON p.created_at >= s.start_time
   AND (s.close_time IS NULL OR p.created_at <= s.close_time)
WHERE p.order_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM shift_transactions st
      WHERE st.shift_id = s.id
        AND st.order_id = p.order_id
        AND st.type = 'sale'
  );