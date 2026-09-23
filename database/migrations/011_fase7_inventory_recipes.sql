-- ============================================
-- FASE 7: Inventario y Recetas — Migracion
-- ============================================
USE comandapro;

-- ============================================
-- 1. Enriquecer tabla inventory
-- ============================================
-- Agregar columnas nuevas
ALTER TABLE inventory
    ADD COLUMN catalog_item_id INT NULL AFTER id,
    ADD COLUMN cost_per_unit DECIMAL(10,2) DEFAULT 0 AFTER min_stock,
    ADD COLUMN supplier_id INT NULL AFTER cost_per_unit;

-- Renombrar quantity → stock (es la fuente de verdad)
ALTER TABLE inventory CHANGE COLUMN quantity stock DECIMAL(10,3) NOT NULL DEFAULT 0;

-- Agregar FKs e indices
ALTER TABLE inventory
    ADD CONSTRAINT fk_inventory_catalog
        FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_inventory_supplier
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    ADD INDEX idx_inventory_catalog (catalog_item_id),
    ADD INDEX idx_inventory_supplier (supplier_id),
    ADD INDEX idx_inventory_stock (stock, min_stock);

-- ============================================
-- 2. Enriquecer tabla recipes
-- ============================================
-- Renombrar quantity → quantity_per_unit
ALTER TABLE recipes CHANGE COLUMN quantity quantity_per_unit DECIMAL(10,3) NOT NULL;

-- Unique constraint: un ingrediente no se repite por producto
ALTER TABLE recipes
    ADD CONSTRAINT uk_product_inventory UNIQUE KEY (product_id, inventory_id);

-- Indices adicionales
ALTER TABLE recipes
    ADD INDEX idx_recipes_product (product_id),
    ADD INDEX idx_recipes_inventory (inventory_id);
