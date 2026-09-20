-- ============================================
-- FASE 5: Migrar modificadores a catalogos
-- ============================================
USE comandapro;

-- 1. Columnas nuevas en catalog_groups
ALTER TABLE catalog_groups
    ADD COLUMN is_modifier BOOLEAN DEFAULT FALSE AFTER color,
    ADD COLUMN required BOOLEAN DEFAULT FALSE AFTER is_modifier,
    ADD COLUMN max_selections INT DEFAULT 1 AFTER required;

-- 2. Columna nueva en catalog_items
ALTER TABLE catalog_items
    ADD COLUMN price_adjustment DECIMAL(10,2) DEFAULT 0 AFTER sort_order;

-- 3. Crear los 3 grupos modificadores faltantes como catalog_groups
INSERT INTO catalog_groups (name, slug, description, sort_order, icon, color, is_modifier, required, max_selections)
VALUES ('Tipo de Leche', 'tipo_leche', 'Alternativas de leche para bebidas', 9, 'water_drop', '#543310', TRUE, FALSE, 1);

INSERT INTO catalog_groups (name, slug, description, sort_order, icon, color, is_modifier, required, max_selections)
VALUES ('Temperatura', 'temperatura', 'Temperatura de la bebida', 10, 'thermostat', '#0061a4', TRUE, FALSE, 1);

INSERT INTO catalog_groups (name, slug, description, sort_order, icon, color, is_modifier, required, max_selections)
VALUES ('Extras', 'extras', 'Extras adicionales para bebidas', 11, 'add_circle', '#006b3f', TRUE, FALSE, 3);

-- 4. Fusionar el grupo modificador Tamanos (id=2) en el catalogo existente Tamanos (id=3)
UPDATE catalog_groups SET is_modifier = TRUE, required = FALSE, max_selections = 1 WHERE id = 3;

-- 5. Mapeo: modifier_groups -> catalog_groups
CREATE TEMPORARY TABLE mod_map (old_id INT, new_id INT);

-- Tipo de Leche: modifier_group 1 -> catalog_group 9
INSERT INTO mod_map (old_id, new_id) SELECT 1, id FROM catalog_groups WHERE slug = 'tipo_leche';
-- Tamanos: modifier_group 2 -> catalog_group 3 (ya existe, fusionado)
INSERT INTO mod_map VALUES (2, 3);
-- Temperatura: modifier_group 3 -> catalog_group 10
INSERT INTO mod_map (old_id, new_id) SELECT 3, id FROM catalog_groups WHERE slug = 'temperatura';
-- Extras: modifier_group 4 -> catalog_group 11
INSERT INTO mod_map (old_id, new_id) SELECT 4, id FROM catalog_groups WHERE slug = 'extras';

-- 6. Migrar modifier_options -> catalog_items (excepto Tamanos)
INSERT INTO catalog_items (group_id, name, price_adjustment, sort_order, icon, active)
SELECT map.new_id, mo.name, mo.price_adjustment, mo.display_order,
       CASE map.old_id
           WHEN 1 THEN 'water_drop'
           WHEN 3 THEN 'thermostat'
           ELSE 'add_circle'
       END,
       mo.active
FROM modifier_options mo
JOIN mod_map map ON mo.group_id = map.old_id
WHERE mo.group_id != 2;

-- 7. Actualizar price_adjustment en los items del catalogo Tamanos (group_id=3)
UPDATE catalog_items SET price_adjustment = -4.00 WHERE group_id = 3 AND name = 'Pequeno (8oz)';
UPDATE catalog_items SET price_adjustment = 0.00 WHERE group_id = 3 AND name = 'Mediano (12oz)';
UPDATE catalog_items SET price_adjustment = 4.00 WHERE group_id = 3 AND name = 'Grande (16oz)';
UPDATE catalog_items SET price_adjustment = 8.00 WHERE group_id = 3 AND name = 'Familiar (20oz)';

-- 8. Recrear product_modifier_groups con FK a catalog_groups
CREATE TABLE product_modifier_groups_new (
    product_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (product_id, group_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES catalog_groups(id) ON DELETE CASCADE
);

INSERT INTO product_modifier_groups_new (product_id, group_id)
SELECT pmg.product_id, map.new_id
FROM product_modifier_groups pmg
JOIN mod_map map ON pmg.group_id = map.old_id;

DROP TABLE product_modifier_groups;
RENAME TABLE product_modifier_groups_new TO product_modifier_groups;

-- Indices
CREATE INDEX idx_pmg_group ON product_modifier_groups(group_id);

-- 9. Limpiar
DROP TEMPORARY TABLE mod_map;

-- 10. Eliminar tablas de modificadores
DROP TABLE modifier_options;
DROP TABLE modifier_groups;