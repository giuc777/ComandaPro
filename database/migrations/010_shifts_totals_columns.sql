-- ============================================
-- FASE 10: Agregar columnas de totales a shifts
-- La tabla shifts no tenia total_sales, cash_sales,
-- card_sales, qr_sales ni transaction_count, que
-- sp_close_shift escribe al cerrar el turno. Sin
-- estas columnas, el cierre fallaba con
-- "Unknown column 'total_sales' in 'field list'".
-- ============================================

ALTER TABLE shifts
    ADD COLUMN IF NOT EXISTS total_sales DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cash_sales DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS card_sales DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS qr_sales DECIMAL(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS transaction_count INT DEFAULT 0;