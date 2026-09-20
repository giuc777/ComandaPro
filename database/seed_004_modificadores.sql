-- ============================================
-- FASE 3: Datos semilla - Modificadores
-- ============================================
USE comandapro;

-- ============================================
-- Grupos
-- ============================================
INSERT INTO modifier_groups (name, required, max_selections, display_order) VALUES
('Tipo de Leche', FALSE, 1, 1),
('Tamanos', FALSE, 1, 2),
('Temperatura', FALSE, 1, 3),
('Extras', FALSE, 3, 4);

-- ============================================
-- Opciones
-- ============================================
INSERT INTO modifier_options (group_id, name, price_adjustment, display_order) VALUES
-- Tipo de Leche (group 1)
(1, 'Entera', 0, 1),
(1, 'Deslactosada', 0, 2),
(1, 'Avena', 4.00, 3),
(1, 'Almendras', 5.00, 4),
(1, 'Soya', 4.00, 5),
(1, 'Coco', 5.00, 6),
-- Tamanos (group 2)
(2, 'Chico 8oz', -4.00, 1),
(2, 'Mediano 12oz', 0.00, 2),
(2, 'Grande 16oz', 4.00, 3),
-- Temperatura (group 3)
(3, 'Caliente', 0.00, 1),
(3, 'Frio', 0.00, 2),
-- Extras (group 4)
(4, 'Shot Extra', 6.00, 1),
(4, 'Vainilla', 4.00, 2),
(4, 'Caramelo', 4.00, 3),
(4, 'Avellana', 4.00, 4),
(4, 'Miel', 3.00, 5),
(4, 'Espuma Extra', 3.00, 6);

-- ============================================
-- Asignar grupos a productos (por nombre)
-- ============================================
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 1 FROM products p WHERE p.name = 'Latte Vainilla';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Latte Vainilla';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 3 FROM products p WHERE p.name = 'Latte Vainilla';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 4 FROM products p WHERE p.name = 'Latte Vainilla';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 1 FROM products p WHERE p.name = 'Flat White Doble';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Flat White Doble';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 1 FROM products p WHERE p.name = 'Capuchino Clasico';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Capuchino Clasico';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 3 FROM products p WHERE p.name = 'Capuchino Clasico';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Americano';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Espresso Doble';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 1 FROM products p WHERE p.name = 'Mocha Chocolate';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Mocha Chocolate';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 3 FROM products p WHERE p.name = 'Mocha Chocolate';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 4 FROM products p WHERE p.name = 'Mocha Chocolate';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Cold Brew Nitro';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 4 FROM products p WHERE p.name = 'Cold Brew Nitro';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 1 FROM products p WHERE p.name = 'Iced Latte';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Iced Latte';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 3 FROM products p WHERE p.name = 'Iced Latte';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Frappe Mocha';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 4 FROM products p WHERE p.name = 'Frappe Mocha';

INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 2 FROM products p WHERE p.name = 'Te Chai Frio';
INSERT INTO product_modifier_groups (product_id, group_id)
SELECT p.id, 3 FROM products p WHERE p.name = 'Te Chai Frio';