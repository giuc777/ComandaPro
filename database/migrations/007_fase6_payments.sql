-- ============================================
-- FASE 6: Pagos (cobro manual)
-- ============================================

-- Migrar enum de metodo a espanol
ALTER TABLE payments MODIFY COLUMN method
    ENUM('efectivo','tarjeta','qr') NOT NULL;

-- Campos para trazabilidad del cobro
ALTER TABLE payments
    ADD COLUMN cashier_id INT NULL AFTER change_amount,
    ADD COLUMN sat_invoice VARCHAR(50) NULL AFTER cashier_id,
    ADD CONSTRAINT fk_payments_cashier FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL;

-- Indices
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_method ON payments(method);
