-- ============================================
-- FASE 3: Modificadores
-- ============================================
USE comandapro;

-- Eliminar tabla legacy (0 filas)
DROP TABLE IF EXISTS modifiers;

-- Eliminar columna legacy JSON de products
ALTER TABLE products DROP COLUMN IF EXISTS modifier_groups;

-- ============================================
-- Tabla de Grupos de Modificadores
-- ============================================
CREATE TABLE modifier_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    max_selections INT DEFAULT 1,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Tabla de Opciones de Modificadores
-- ============================================
CREATE TABLE modifier_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE,
    UNIQUE KEY unique_option_per_group (group_id, name)
);

-- ============================================
-- Tabla de Asignacion Producto <-> Grupo Modificador
-- ============================================
CREATE TABLE product_modifier_groups (
    product_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (product_id, group_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- Indices
CREATE INDEX idx_modifier_groups_active ON modifier_groups(active);
CREATE INDEX idx_modifier_options_group ON modifier_options(group_id);
CREATE INDEX idx_pmg_group ON product_modifier_groups(group_id);