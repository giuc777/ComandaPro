-- ============================================
-- DeerCoffee / ComandaPro - migracion 018
-- FASE 05 (KDS cocina) + FASE 15 (ordenes del administrador)
--
--   orders      : sent_at, started_at, ready_at, completed_at (tiempos de cocina)
--                 updated_by (quien edito la orden desde /ordenes)
--   order_items : sent, sent_at, prepared_at
--   indices     : idx_orders_kds (status, sent_at) para el polling del KDS
--                 fk_orders_updated_by (updated_by) requerido por la FK
--
-- El ENUM orders.status NO cambia: ya trae enviada, preparando, lista,
-- completada (FASE 04).
--
-- Idempotente: ADD COLUMN / CREATE INDEX / ADD FOREIGN KEY con IF NOT EXISTS,
-- por lo que se puede re-ejecutar sin fallar (solo genera warnings).
--
-- Verificacion previa recomendada:
--   SELECT COUNT(*) FROM information_schema.COLUMNS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'
--     AND COLUMN_NAME IN ('sent_at','started_at','ready_at','completed_at','updated_by');
--   -- debe dar 5 en produccion (o 0 si nunca se aplico)
--
-- Aplicar:
--   mysql DeerCoffeeDB < Deploy/Produccion/migrations/018_kds_cocina.sql
-- ============================================
USE `DeerCoffeeDB`;

-- ===== Tiempos de cocina en la orden =====
ALTER TABLE `orders`
    ADD COLUMN IF NOT EXISTS `sent_at`      TIMESTAMP NULL AFTER `parked_at`,
    ADD COLUMN IF NOT EXISTS `started_at`   TIMESTAMP NULL AFTER `sent_at`,
    ADD COLUMN IF NOT EXISTS `ready_at`     TIMESTAMP NULL AFTER `started_at`,
    ADD COLUMN IF NOT EXISTS `completed_at` TIMESTAMP NULL AFTER `ready_at`;

-- ===== Quien edito la orden (FASE 15) =====
ALTER TABLE `orders`
    ADD COLUMN IF NOT EXISTS `updated_by` INT(11) DEFAULT NULL AFTER `voided_by`;

-- ===== Indices para el polling del KDS =====
CREATE INDEX IF NOT EXISTS `idx_orders_kds` ON `orders` (`status`, `sent_at`);
CREATE INDEX IF NOT EXISTS `fk_orders_updated_by` ON `orders` (`updated_by`);

-- ===== FK: quien edito la orden (opcional, ON DELETE SET NULL) =====
ALTER TABLE `orders`
    ADD CONSTRAINT `fk_orders_updated_by` FOREIGN KEY IF NOT EXISTS (`updated_by`)
    REFERENCES `users` (`id`) ON DELETE SET NULL;

-- ===== Estado de envio a cocina por item =====
ALTER TABLE `order_items`
    ADD COLUMN IF NOT EXISTS `sent`        TINYINT(1) NOT NULL DEFAULT 0 AFTER `notes`,
    ADD COLUMN IF NOT EXISTS `sent_at`     TIMESTAMP NULL AFTER `sent`,
    ADD COLUMN IF NOT EXISTS `prepared_at` TIMESTAMP NULL AFTER `sent_at`;
