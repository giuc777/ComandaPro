-- ============================================
-- FASE 6: Orders + Tables + Order Items
-- ============================================
USE comandapro;

-- Migrate orders status to Spanish + add parked fields
ALTER TABLE orders MODIFY COLUMN status
    ENUM('pausada','pagada','anulada',
         'enviada','preparando','lista','completada')
    DEFAULT 'pausada';

ALTER TABLE orders
    ADD COLUMN mode ENUM('mesa','llevar') DEFAULT 'mesa' AFTER customer_name,
    ADD COLUMN created_by INT NULL AFTER total,
    ADD COLUMN parked_at TIMESTAMP NULL AFTER created_by,
    ADD COLUMN voided_at TIMESTAMP NULL AFTER parked_at,
    ADD COLUMN voided_by INT NULL AFTER voided_at;

ALTER TABLE orders
    ADD CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_orders_voided_by FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add modifier_labels to order_items
ALTER TABLE order_items ADD COLUMN modifier_labels TEXT NULL AFTER modifiers;

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_parked ON orders(status, parked_at);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Seed tables (matches catalog group 8 'mesas')
INSERT IGNORE INTO tables (id, name, capacity) VALUES
(1, 'Mesa 1', 4),
(2, 'Mesa 2', 4),
(3, 'Mesa 3', 4),
(4, 'Terraza A', 4),
(5, 'Terraza B', 4),
(6, 'Barra Principal', 6),
(7, 'Sala Privada', 8),
(8, 'Area de Estudio', 4);
