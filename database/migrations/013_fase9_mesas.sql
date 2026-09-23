-- ============================================
-- FASE 9: Mesas — Migracion
-- ============================================
USE comandapro;

-- 1. Agregar columnas a catalog_items
ALTER TABLE catalog_items
    ADD COLUMN capacity INT DEFAULT 4 AFTER price_adjustment,
    ADD COLUMN table_id INT NULL AFTER capacity;

-- 2. FK a tables
ALTER TABLE catalog_items
    ADD FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL;

-- 3. Vincular catalog_items existentes del grupo Mesas con la tabla tables
UPDATE catalog_items ci
    JOIN tables t ON ci.name = t.name
SET ci.table_id = t.id, ci.capacity = t.capacity
WHERE ci.group_id = 8 AND ci.table_id IS NULL;
