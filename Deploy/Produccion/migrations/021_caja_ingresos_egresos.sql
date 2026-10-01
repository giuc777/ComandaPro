-- ============================================
-- DeerCoffee / ComandaPro - migracion 021
-- Caja: ingresos y egresos manuales
--
--   shift_transactions.type    : enum('sale','refund','void')
--                             -> enum('sale','refund','void','income','expense')
--   shift_transactions.concept : VARCHAR(120) NULL  (motivo del movimiento)
--
--   * 'income'  = ingreso manual (propina, aporte, etc.)
--   * 'expense' = egreso manual (retiro de caja para compras, etc.)
--
-- Los tipos manuales NO alteran la semantica de ventas: total_sales,
-- cash_sales, card_sales y qr_sales siguen contando solo type='sale'.
-- El arqueo (efectivo esperado) suma los ingresos en efectivo y resta
-- los egresos en efectivo.
--
-- Nota: 'ADD COLUMN' no es idempotente; re-ejecutar da ERROR 1060
-- (Duplicate column name) sin efectos secundarios. El MODIFY del ENUM si
-- es idempotente.
--
-- Verificacion post-aplicacion:
--   SHOW CREATE TABLE shift_transactions;   -- type con income/expense + concept
--
-- Aplicar:
--   mysql comandapro < database/migrations/021_caja_ingresos_egresos.sql
-- ============================================
USE comandapro;

-- 1) motivo del movimiento
ALTER TABLE shift_transactions
    ADD COLUMN concept VARCHAR(120) NULL AFTER type;

-- 2) el ENUM admite movimientos manuales
ALTER TABLE shift_transactions
    MODIFY type ENUM('sale', 'refund', 'void', 'income', 'expense') NOT NULL;

-- 3) verificacion
SELECT id, type, concept, method, amount FROM shift_transactions ORDER BY id DESC LIMIT 5;
