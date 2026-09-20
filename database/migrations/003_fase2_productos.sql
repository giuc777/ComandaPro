-- ============================================
-- FASE 2: Tabla de Productos (mejorada)
-- ============================================
USE comandapro;

-- Eliminar columna antigua category (VARCHAR) si existe
-- y agregar category_id como FK a catalog_items
ALTER TABLE products
    ADD COLUMN category_id INT NULL AFTER name,
    ADD COLUMN description TEXT NULL AFTER cost,
    ADD COLUMN badge VARCHAR(50) NULL AFTER description,
    ADD COLUMN sort_order INT DEFAULT 0 AFTER badge;

-- Agregar FK a catalog_items (la categoria del producto)
ALTER TABLE products
    ADD CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES catalog_items(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Indices
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
CREATE INDEX idx_products_sort_order ON products(sort_order);
