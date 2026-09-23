-- ============================================
-- FASE 10: Normalizar enum de metodo en shift_transactions
-- La columna quedo con el enum original en ingles
-- ('cash','card','qr') y debe coincidir con payments
-- ('efectivo','tarjeta','qr'). Sin esto, cada INSERT
-- de venta al turno fallaba con "Data truncated".
-- ============================================

ALTER TABLE shift_transactions
    MODIFY COLUMN method VARCHAR(20) NOT NULL;

UPDATE shift_transactions
SET method = CASE method
    WHEN 'cash' THEN 'efectivo'
    WHEN 'card' THEN 'tarjeta'
    WHEN 'qr'   THEN 'qr'
    ELSE method
END;

ALTER TABLE shift_transactions
    MODIFY COLUMN method ENUM('efectivo','tarjeta','qr') NOT NULL;