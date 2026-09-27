-- ============================================
-- DeerCoffee / ComandaPro - migracion 017
-- Agrega el resto del menu que falto en el seed:
--   * Bebidas Frios (reactiva categoria id 2)  -> 18 productos (ids 100-117)
--   * Frappes (categoria id 106)               ->  8 productos (ids 118-125)
--   * Smoothies (categoria nueva id 107)       -> 10 productos (ids 126-135)
--   * Licuados (categoria nueva id 108)        ->  1 producto  (id 136)
--   * Limonada y Naranjada (categoria id 109)  ->  1 producto  (id 137)
--   * Frappe Oreo (id 99): precio placeholder Q1.00 -> Q40.00
--   * Grupos modificador para licuado/limonada (ids 12-15)
--   * Modificadores Tamanos/Tipo de Leche/Temperatura/Extras
--     reasignados a las bebidas calientes y frias reales
--
-- Idempotente: usa INSERT IGNORE (PK ids + UNIQUE group_id/name) y
-- UPDATE ... WHERE, por lo que se puede re-ejecutar sin duplicar.
--
-- Verificacion previa recomendada (debe dar 99):
--   SELECT MAX(id) AS max_product_id FROM products;
--
-- Aplicar:
--   mysql DeerCoffeeDB < Deploy/Produccion/migrations/017_menu_frios_smoothies_licuados.sql
-- ============================================
USE `DeerCoffeeDB`;

START TRANSACTION;

-- ===== Grupos modificador nuevos (licuado / limonada) =====
INSERT IGNORE INTO `catalog_groups` (`id`, `name`, `slug`, `description`, `icon`, `color`, `is_modifier`, `required`, `max_selections`, `sort_order`, `active`, `created_at`, `updated_at`) VALUES
  (12, 'Preparacion Licuado', 'preparacion_licuado', 'Con agua o con leche para licuados', 'blender', '#543310', 1, 0, 1, 12, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (13, 'Preparacion Limonada', 'preparacion_limonada', 'Con agua o con soda para limonadas', 'local_drink', '#0061a4', 1, 0, 1, 13, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (14, 'Sabor Licuado', 'sabor_licuado', 'Fruta del licuado', 'eco', '#006b3f', 1, 0, 1, 14, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (15, 'Sabor Limonada', 'sabor_limonada', 'Limonada o naranjada', 'eco', '#006b3f', 1, 0, 1, 15, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00');

-- ===== catalog_items: categorias nuevas + opciones de modificador =====
INSERT IGNORE INTO `catalog_items` (`id`, `group_id`, `name`, `description`, `icon`, `color`, `parent_id`, `sort_order`, `price_adjustment`, `capacity`, `table_id`, `active`, `created_at`, `updated_at`) VALUES
  -- categorias de producto (group_id = 1)
  (107, 1, 'Smoothies', 'Smoothies de fruta', 'blender', '#006b3f', NULL, 13, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (108, 1, 'Licuados', 'Licuados de fruta con agua o con leche', 'blender', '#543310', NULL, 14, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (109, 1, 'Limonada y Naranjada', 'Limonadas y naranjadas', 'local_drink', '#0061a4', NULL, 15, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- grupo 12: Preparacion Licuado (base Q18 = con agua; con leche +2)
  (110, 12, 'Con agua', NULL, NULL, NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (111, 12, 'Con leche', NULL, NULL, NULL, NULL, 2, 2, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- grupo 13: Preparacion Limonada (base Q20 = con agua; con soda +5)
  (112, 13, 'Con agua', NULL, NULL, NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (113, 13, 'Con soda', NULL, NULL, NULL, NULL, 2, 5, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- grupo 14: Sabor Licuado
  (114, 14, 'Fresa', NULL, NULL, NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (115, 14, 'Pina', NULL, NULL, NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (116, 14, 'Banano', NULL, NULL, NULL, NULL, 3, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (117, 14, 'Papaya', NULL, NULL, NULL, NULL, 4, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (118, 14, 'Melon', NULL, NULL, NULL, NULL, 5, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (119, 14, 'Mixto', NULL, NULL, NULL, NULL, 6, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- grupo 15: Sabor Limonada
  (120, 15, 'Limonada', NULL, NULL, NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (121, 15, 'Naranjada', NULL, NULL, NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00');

-- ===== Productos nuevos (ids 100-137) =====
INSERT IGNORE INTO `products` (`id`, `name`, `category_id`, `category`, `price`, `cost`, `description`, `badge`, `sort_order`, `image`, `active`, `created_at`, `updated_at`) VALUES
  -- Bebidas Frios (category_id = 2)
  (100, 'Menta Ice', 2, NULL, 30, 0, NULL, NULL, 1, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (101, 'Tiramisu Ice', 2, NULL, 30, 0, NULL, NULL, 2, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (102, 'Latte Ice', 2, NULL, 30, 0, NULL, NULL, 3, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (103, 'Moka Ice', 2, NULL, 30, 0, NULL, NULL, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (104, 'Nutella Ice', 2, NULL, 30, 0, NULL, NULL, 5, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (105, 'Vainilla Ice', 2, NULL, 30, 0, NULL, NULL, 6, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (106, 'Caramelo Ice', 2, NULL, 30, 0, NULL, NULL, 7, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (107, 'Almendra Ice', 2, NULL, 30, 0, NULL, NULL, 8, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (108, 'Amareto Ice', 2, NULL, 30, 0, NULL, NULL, 9, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (109, 'Ice Lollipop', 2, NULL, 35, 0, NULL, NULL, 10, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (110, 'Ice Apple', 2, NULL, 35, 0, NULL, NULL, 11, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (111, 'Ice Peach', 2, NULL, 35, 0, NULL, NULL, 12, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (112, 'Botella de Agua', 2, NULL, 10, 0, NULL, NULL, 13, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (113, 'Jugo California', 2, NULL, 13, 0, NULL, NULL, 14, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (114, 'Gaseosa en lata', 2, NULL, 10, 0, NULL, NULL, 15, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (115, 'Gatorade', 2, NULL, 15, 0, NULL, NULL, 16, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (116, 'Cold Brew', 2, NULL, 20, 0, NULL, NULL, 17, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (117, 'Iced Matcha Latte', 2, NULL, 30, 0, NULL, NULL, 18, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- Frappes (category_id = 106); Frappe Oreo ya existe como id 99
  (118, 'Frappe Vainilla', 106, NULL, 35, 0, NULL, NULL, 2, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (119, 'Frappe Amareto', 106, NULL, 35, 0, NULL, NULL, 3, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (120, 'Frappe Coco', 106, NULL, 35, 0, NULL, NULL, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (121, 'Frappe Chocolate', 106, NULL, 35, 0, NULL, NULL, 5, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (122, 'Frappe Tradicional', 106, NULL, 35, 0, NULL, NULL, 6, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (123, 'Frappe Caramelo', 106, NULL, 35, 0, NULL, NULL, 7, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (124, 'Frappe Tiramisu', 106, NULL, 35, 0, NULL, NULL, 8, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (125, 'Frappe de Matcha', 106, NULL, 35, 0, NULL, NULL, 9, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- Smoothies (category_id = 107)
  (126, 'Smoothie Manzana verde', 107, NULL, 30, 0, NULL, NULL, 1, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (127, 'Smoothie Mango', 107, NULL, 30, 0, NULL, NULL, 2, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (128, 'Smoothie Mora', 107, NULL, 30, 0, NULL, NULL, 3, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (129, 'Smoothie Fresa-banano', 107, NULL, 30, 0, NULL, NULL, 4, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (130, 'Smoothie 3 Berries', 107, NULL, 30, 0, NULL, NULL, 5, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (131, 'Smoothie Fresa', 107, NULL, 30, 0, NULL, NULL, 6, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (132, 'Smoothie Frutas Tropicales', 107, NULL, 30, 0, NULL, NULL, 7, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (133, 'Affogato', 107, NULL, 30, 0, NULL, NULL, 8, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (134, 'Horchata', 107, NULL, 25, 0, NULL, NULL, 9, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  (135, 'Rosa de Jamaica', 107, NULL, 25, 0, NULL, NULL, 10, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- Licuados (category_id = 108) - base Q18 con agua; con leche +2 (modificador)
  (136, 'Licuado de Frutas', 108, NULL, 18, 0, 'Fresa, pina, banano, papaya, melon o mixto. Con agua o con leche.', NULL, 1, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00'),
  -- Limonada y Naranjada (category_id = 109) - base Q20 con agua; con soda +5 (modificador)
  (137, 'Limonada / Naranjada', 109, NULL, 20, 0, 'Con agua o con soda.', NULL, 1, NULL, 1, '2026-09-27 00:00:00', '2026-09-27 00:00:00');

-- ===== Ajustes a datos existentes =====
-- Reactiva la categoria "Bebidas Frios" (quedo vacia y desactivada en el seed)
UPDATE `catalog_items` SET `active` = 1, `updated_at` = '2026-09-27 00:00:00' WHERE `id` = 2;
-- Precio real de Frappe Oreo (estaba en placeholder Q1.00)
UPDATE `products` SET `price` = 40, `description` = 'La vida es corta, disfruta Frappe Oreo.', `updated_at` = '2026-09-27 00:00:00' WHERE `id` = 99;

-- ===== Modificadores de licuado y limonada =====
INSERT IGNORE INTO `product_modifier_groups` (`product_id`, `group_id`) VALUES
  (136, 12),
  (136, 14),
  (137, 13),
  (137, 15);

-- ===== Modificadores de bebidas reales (Tamanos, Tipo de Leche, Temperatura, Extras) =====
-- Bebidas calientes (category_id = 1) y frias (category_id = 2), excluyendo las embotelladas.
INSERT IGNORE INTO `product_modifier_groups` (`product_id`, `group_id`)
SELECT p.id, cg.id
FROM `products` p
CROSS JOIN `catalog_groups` cg
WHERE p.category_id IN (1, 2)
  AND p.active = 1
  AND p.name NOT IN ('Botella de Agua', 'Jugo California', 'Gaseosa en lata', 'Gatorade')
  AND cg.id IN (3, 9, 10, 11)
  AND cg.active = 1
  AND cg.is_modifier = 1;

COMMIT;

-- ===== Verificacion posterior (opcional) =====
-- SELECT COUNT(*) AS total_productos FROM products;                                 -- esperado: 137
-- SELECT category_id, COUNT(*) FROM products WHERE category_id IN (2,106,107,108,109) GROUP BY category_id;
-- SELECT p.name, cg.name AS grupo FROM product_modifier_groups pmg JOIN products p ON p.id = pmg.product_id JOIN catalog_groups cg ON cg.id = pmg.group_id WHERE p.id IN (136,137);
