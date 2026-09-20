-- ============================================
-- MIGRACIÓN 002: FASE 2 - Catálogos
-- DeerCoffee - MariaDB
-- ============================================

USE comandapro;

-- ============================================
-- 1. Tabla de Grupos de Catálogo
-- ============================================
CREATE TABLE IF NOT EXISTS catalog_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- 2. Tabla de Ítems de Catálogo
-- ============================================
CREATE TABLE IF NOT EXISTS catalog_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color VARCHAR(7),
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES catalog_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
    UNIQUE KEY unique_name_per_group (group_id, name)
);

-- ============================================
-- 3. Índices
-- ============================================
CREATE INDEX idx_catalog_groups_slug ON catalog_groups(slug);
CREATE INDEX idx_catalog_groups_active ON catalog_groups(active);
CREATE INDEX idx_catalog_items_group ON catalog_items(group_id);
CREATE INDEX idx_catalog_items_parent ON catalog_items(parent_id);
CREATE INDEX idx_catalog_items_active ON catalog_items(active);

-- ============================================
-- 4. Relación Products → Catalog Items
-- ============================================
ALTER TABLE products ADD COLUMN category_id INT NULL;
ALTER TABLE products ADD FOREIGN KEY (category_id) REFERENCES catalog_items(id) ON DELETE SET NULL;

-- ============================================
-- 5. Datos iniciales
-- ============================================
INSERT INTO catalog_groups (name, slug, description, sort_order) VALUES
('Categorías de Producto', 'categorias_producto', 'Clasificación general de productos del menú', 1),
('Tipos de Bebida', 'tipos_bebida', 'Subcategorías para bebidas', 2),
('Tamaños', 'tamanos', 'Tamaños disponibles para bebidas y comidas', 3),
('Métodos de Preparación', 'metodos_preparacion', 'Formas de preparar las bebidas', 4),
('Ingredientes Principales', 'ingredientes_principales', 'Base de ingredientes para recetas', 5);

INSERT INTO catalog_items (group_id, name, icon, color, sort_order) VALUES
(1, 'Bebidas Calientes', 'local_cafe', '#543310', 1),
(1, 'Bebidas Frías', 'ice_drink', '#0061a4', 2),
(1, 'Comida', 'restaurant', '#006b3f', 3),
(1, 'Postres', 'cake', '#9c4221', 4),
(1, 'Alimentos', 'lunch_dining', '#543310', 5),
(2, 'Espresso', 'coffee', '#543310', 1),
(2, 'Filtrados', 'filter_drip', '#543310', 2),
(2, 'Cold Brew', 'ac_unit', '#0061a4', 3),
(2, 'Smoothies', 'blender', '#006b3f', 4),
(2, 'Tés', 'spa', '#002b26', 5),
(3, 'Pequeño (8oz)', 'size_small', null, 1),
(3, 'Mediano (12oz)', 'size_medium', null, 2),
(3, 'Grande (16oz)', 'size_large', null, 3),
(3, 'Familiar (20oz)', 'sports_bar', null, 4),
(4, 'Italiano', 'machine', null, 1),
(4, 'Americano', 'coffee', null, 2),
(4, 'V60', 'architecture', null, 3),
(4, 'Chemex', 'science', null, 4),
(4, 'Aeropress', 'sports_mma', null, 5),
(5, 'Café Arabica', 'coffee', '#543310', 1),
(5, 'Leche Entera', 'water_drop', '#f5f5f5', 2),
(5, 'Leche de Avena', 'grass', '#006b3f', 3),
(5, 'Chocolate', 'cookie', '#9c4221', 4),
(5, 'Vainilla', 'local_florist', '#9c4221', 5),
(5, 'Matcha', 'eco', '#006b3f', 6);
