-- ============================================
-- FASE 7: Datos semilla — Inventario y Recetas
-- ============================================
USE comandapro;

-- ============================================
-- Insumos de inventario (vinculados al catalogo)
-- ============================================
INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id) VALUES
((SELECT id FROM catalog_items WHERE name='Cafe Arabica' LIMIT 1),    'Cafe en Granos',    'kg',      50.000, 10.000, 42.00, NULL),
((SELECT id FROM catalog_items WHERE name='Leche Entera' LIMIT 1),    'Leche Entera',      'litros',  100.000, 20.000,  8.00, NULL),
((SELECT id FROM catalog_items WHERE name='Leche de Avena' LIMIT 1),  'Leche de Avena',    'litros',   50.000, 10.000, 12.00, NULL),
((SELECT id FROM catalog_items WHERE name='Vainilla' LIMIT 1),        'Vainilla',          'ml',      500.000, 100.000,  0.50, NULL),
((SELECT id FROM catalog_items WHERE name='Chocolate' LIMIT 1),       'Chocolate en Polvo','kg',        5.000,   1.000, 35.00, NULL),
((SELECT id FROM catalog_items WHERE name='Matcha' LIMIT 1),          'Matcha',            'kg',        2.000,   0.500, 85.00, NULL);

-- Insumos sin catalogo (productos de reventa / elaborados)
INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id) VALUES
(NULL, 'Croissant de Mantequilla',  'piezas',  60.000, 12.000,  6.00, NULL),
(NULL, 'Muffin de Arandanos',       'piezas',  40.000,  8.000,  7.00, NULL),
(NULL, 'Rebanada de Cheesecake',    'piezas',  20.000,  4.000, 12.00, NULL),
(NULL, 'Tortilla Integral',         'piezas',  50.000, 10.000,  2.50, NULL),
(NULL, 'Pan de Sandwich',           'piezas',  40.000, 10.000,  3.00, NULL),
(NULL, 'Baguette',                  'piezas',  30.000,  6.000,  5.00, NULL),
(NULL, 'Jamon',                     'kg',       5.000,  1.000, 65.00, NULL),
(NULL, 'Queso Oaxaca',             'kg',       4.000,  1.000, 70.00, NULL),
(NULL, 'Aguacate',                  'piezas',  20.000,  4.000, 15.00, NULL),
(NULL, 'Crema Agria',              'litros',    3.000,  1.000, 18.00, NULL),
(NULL, 'Acai Pure',                 'kg',       8.000,  2.000, 90.00, NULL),
(NULL, 'Granola',                   'kg',       6.000,  1.500, 30.00, NULL),
(NULL, 'Fruta Fresca (mix)',        'kg',       5.000,  1.000, 40.00, NULL),
(NULL, 'Chai Concentrado',          'litros',    4.000,  1.000, 55.00, NULL),
(NULL, 'Helado de Vainilla',       'kg',       8.000,  2.000, 45.00, NULL),
(NULL, 'Frappuccion Mocha',         'kg',       3.000,  1.000, 60.00, NULL);

-- ============================================
-- Recetas: Bebidas de espresso
-- ============================================

-- 1. Latte Vainilla
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 0.300, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 15.000, 'ml' FROM inventory WHERE name='Vainilla' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 2. Flat White Doble
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 2, id, 0.024, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 2, id, 0.250, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 3. Capuchino Clasico
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 3, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 3, id, 0.200, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 4. Americano
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 4, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 5. Espresso Doble
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 5, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 6. Mocha Chocolate
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 6, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 6, id, 0.250, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 6, id, 0.020, 'kg' FROM inventory WHERE name='Chocolate en Polvo' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 7. Cortado
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 7, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 7, id, 0.050, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- ============================================
-- Recetas: Bebidas frias
-- ============================================

-- 8. Cold Brew Nitro
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 8, id, 0.030, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 9. Iced Latte
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 9, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 9, id, 0.300, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 10. Frappe Mocha
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 10, id, 0.018, 'kg' FROM inventory WHERE name='Cafe en Granos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 10, id, 0.150, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 10, id, 0.100, 'kg' FROM inventory WHERE name='Helado de Vainilla' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 10, id, 0.020, 'kg' FROM inventory WHERE name='Frappuccion Mocha' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 11. Te Chai Frio
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 11, id, 0.200, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 11, id, 0.100, 'litros' FROM inventory WHERE name='Chai Concentrado' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- ============================================
-- Recetas: Panaderia (reventa 1:1)
-- ============================================

-- 15. Croissant de Mantequilla
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 15, id, 1.000, 'piezas' FROM inventory WHERE name='Croissant de Mantequilla' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 16. Muffin Arandanos
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 16, id, 1.000, 'piezas' FROM inventory WHERE name='Muffin de Arandanos' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 17. Cheesecake
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 17, id, 1.000, 'piezas' FROM inventory WHERE name='Rebanada de Cheesecake' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- ============================================
-- Recetas: Platillos (ensamblados)
-- ============================================

-- 12. Sandwich Club
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 12, id, 2.000, 'piezas' FROM inventory WHERE name='Pan de Sandwich' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 12, id, 0.080, 'kg' FROM inventory WHERE name='Jamon' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 12, id, 0.060, 'kg' FROM inventory WHERE name='Queso Oaxaca' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 12, id, 0.500, 'piezas' FROM inventory WHERE name='Aguacate' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 13. Baguette Jamon Queso
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 13, id, 1.000, 'piezas' FROM inventory WHERE name='Baguette' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 13, id, 0.100, 'kg' FROM inventory WHERE name='Jamon' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 13, id, 0.080, 'kg' FROM inventory WHERE name='Queso Oaxaca' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 14. Wrap Vegetariano
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 14, id, 1.000, 'piezas' FROM inventory WHERE name='Tortilla Integral' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 14, id, 0.500, 'piezas' FROM inventory WHERE name='Aguacate' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 14, id, 0.050, 'litros' FROM inventory WHERE name='Crema Agria' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 18. Granola Bowl
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 18, id, 0.080, 'kg' FROM inventory WHERE name='Granola' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 18, id, 0.100, 'litros' FROM inventory WHERE name='Leche Entera' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 18, id, 0.150, 'kg' FROM inventory WHERE name='Fruta Fresca (mix)' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 19. Tostadas Aguacate
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 19, id, 2.000, 'piezas' FROM inventory WHERE name='Tortilla Integral' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 19, id, 0.500, 'piezas' FROM inventory WHERE name='Aguacate' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 19, id, 0.050, 'litros' FROM inventory WHERE name='Crema Agria' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 20. Acai Bowl
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 20, id, 0.200, 'kg' FROM inventory WHERE name='Acai Pure' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 20, id, 0.060, 'kg' FROM inventory WHERE name='Granola' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 20, id, 0.100, 'kg' FROM inventory WHERE name='Fruta Fresca (mix)' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

-- 21. Croissant
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 21, id, 1.000, 'piezas' FROM inventory WHERE name='Croissant de Mantequilla' LIMIT 1
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
