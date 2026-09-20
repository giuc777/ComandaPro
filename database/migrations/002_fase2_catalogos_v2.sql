-- MIGRACION 002: FASE 2 - Catalogos
USE comandapro;

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

CREATE INDEX IF NOT EXISTS idx_cg_slug ON catalog_groups(slug);
CREATE INDEX IF NOT EXISTS idx_cg_active ON catalog_groups(active);
CREATE INDEX IF NOT EXISTS idx_ci_group ON catalog_items(group_id);
CREATE INDEX IF NOT EXISTS idx_ci_parent ON catalog_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_ci_active ON catalog_items(active);

INSERT IGNORE INTO catalog_groups (id, name, slug, description, sort_order) VALUES
(1, 'Categorias de Producto', 'categorias_producto', 'Clasificacion de productos del menu', 1),
(2, 'Tipos de Bebida', 'tipos_bebida', 'Subcategorias para bebidas', 2),
(3, 'Tamanos', 'tamanos', 'Tamanos disponibles para bebidas y comidas', 3),
(4, 'Metodos de Preparacion', 'metodos_preparacion', 'Formas de preparar las bebidas', 4),
(5, 'Ingredientes Principales', 'ingredientes_principales', 'Base de ingredientes para recetas', 5);

INSERT IGNORE INTO catalog_items (id, group_id, name, icon, color, sort_order) VALUES
(1, 1, 'Bebidas Calientes', 'local_cafe', '#543310', 1),
(2, 1, 'Bebidas Frios', 'ice_drink', '#0061a4', 2),
(3, 1, 'Comida', 'restaurant', '#006b3f', 3),
(4, 1, 'Postres', 'cake', '#9c4221', 4),
(5, 1, 'Alimentos', 'lunch_dining', '#543310', 5),
(6, 2, 'Espresso', 'coffee', '#543310', 1),
(7, 2, 'Filtrados', 'filter_drip', '#543310', 2),
(8, 2, 'Cold Brew', 'ac_unit', '#0061a4', 3),
(9, 2, 'Smoothies', 'blender', '#006b3f', 4),
(10, 2, 'Tes', 'spa', '#002b26', 5),
(11, 3, 'Pequeno (8oz)', 'size_small', NULL, 1),
(12, 3, 'Mediano (12oz)', 'size_medium', NULL, 2),
(13, 3, 'Grande (16oz)', 'size_large', NULL, 3),
(14, 3, 'Familiar (20oz)', 'sports_bar', NULL, 4),
(15, 4, 'Italiano', 'machine', NULL, 1),
(16, 4, 'Americano', 'coffee', NULL, 2),
(17, 4, 'V60', 'architecture', NULL, 3),
(18, 4, 'Chemex', 'science', NULL, 4),
(19, 4, 'Aeropress', 'sports_mma', NULL, 5),
(20, 5, 'Cafe Arabica', 'coffee', '#543310', 1),
(21, 5, 'Leche Entera', 'water_drop', '#f5f5f5', 2),
(22, 5, 'Leche de Avena', 'grass', '#006b3f', 3),
(23, 5, 'Chocolate', 'cookie', '#9c4221', 4),
(24, 5, 'Vainilla', 'local_florist', '#9c4221', 5),
(25, 5, 'Matcha', 'eco', '#006b3f', 6);
