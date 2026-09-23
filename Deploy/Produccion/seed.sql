-- ============================================
-- DeerCoffee / ComandaPro - seed.sql
-- Datos iniciales. NO incluye transacciones (ventas, pagos, turnos).
--
-- Usuarios iniciales (1 por rol):
--   admin  / admin123     -> Administrador
--   mateo  / barista123   -> Barista
--   carlos / barista123   -> Cajero
-- ============================================
USE `comandapro`;

SET FOREIGN_KEY_CHECKS = 0;

-- ===== Usuarios =====
INSERT INTO `users` (`id`, `username`, `password_hash`, `name`, `email`, `role`, `avatar`, `sucursal`, `active`, `failed_attempts`) VALUES
  (1, 'admin', '$2b$12$d4t5Ym6KzTjp2/oYyY36fe.OLoZ825/ftAB21dVu0Cs8guT3h86Ca', 'Administrador', 'admin@comandapro.com', 'Administrador', 'A', 'Roma Norte', 1, 0),
  (2, 'mateo', '$2b$12$lr9r3JiB0S7K7pd.adxRjOtPE8FwAR8HZmeDCvfdTq2ZkBfboupYG', 'Mateo Garcia', 'mateo@comandapro.com', 'Barista', 'M', 'Roma Norte', 1, 0),
  (3, 'carlos', '$2b$12$lr9r3JiB0S7K7pd.adxRjOtPE8FwAR8HZmeDCvfdTq2ZkBfboupYG', 'Carlos Lopez', 'carlos@comandapro.com', 'Cajero', 'C', 'Roma Norte', 1, 0);

-- ===== Datos de referencia =====

-- settings (1 filas)
INSERT INTO `settings` (`setting_key`, `setting_value`, `updated_at`) VALUES
  ('sucursal_nombre', 'Calle del lago', '2026-09-22 01:55:46');

-- role_permissions (30 filas)
INSERT INTO `role_permissions` (`role`, `module_key`, `allowed`, `updated_at`) VALUES
  ('Administrador', 'ajustes', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'caja', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'catalogos', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'dashboard', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'inventario', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'kds', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'pos', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'productos', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'proveedores', 1, '2026-09-22 01:03:19'),
  ('Administrador', 'reportes', 1, '2026-09-22 01:03:19'),
  ('Barista', 'ajustes', 1, '2026-09-22 01:03:19'),
  ('Barista', 'caja', 1, '2026-09-22 01:03:19'),
  ('Barista', 'catalogos', 0, '2026-09-22 01:52:39'),
  ('Barista', 'dashboard', 1, '2026-09-22 01:03:19'),
  ('Barista', 'inventario', 0, '2026-09-22 01:03:19'),
  ('Barista', 'kds', 1, '2026-09-22 01:03:19'),
  ('Barista', 'pos', 1, '2026-09-22 01:03:19'),
  ('Barista', 'productos', 0, '2026-09-22 01:03:19'),
  ('Barista', 'proveedores', 0, '2026-09-22 01:03:19'),
  ('Barista', 'reportes', 0, '2026-09-22 01:03:19'),
  ('Cajero', 'ajustes', 1, '2026-09-22 01:03:19'),
  ('Cajero', 'caja', 1, '2026-09-22 01:03:19'),
  ('Cajero', 'catalogos', 0, '2026-09-22 01:03:19'),
  ('Cajero', 'dashboard', 1, '2026-09-22 01:03:19'),
  ('Cajero', 'inventario', 0, '2026-09-22 01:03:19'),
  ('Cajero', 'kds', 0, '2026-09-22 01:44:18'),
  ('Cajero', 'pos', 1, '2026-09-22 01:03:19'),
  ('Cajero', 'productos', 0, '2026-09-22 01:03:19'),
  ('Cajero', 'proveedores', 0, '2026-09-22 01:03:19'),
  ('Cajero', 'reportes', 0, '2026-09-22 01:03:19');

-- catalog_groups (11 filas)
INSERT INTO `catalog_groups` (`id`, `name`, `slug`, `description`, `icon`, `color`, `is_modifier`, `required`, `max_selections`, `sort_order`, `active`, `created_at`, `updated_at`) VALUES
  (1, 'Categorias de Producto', 'categorias_producto', 'Clasificacion de productos del menu', 'restaurant', '#543310', 0, 0, 1, 1, 1, '2026-09-19 22:11:38', '2026-09-19 22:41:24'),
  (2, 'Tipos de Bebida', 'tipos_bebida', 'Subcategorias para bebidas', 'local_cafe', '#0061a4', 0, 0, 1, 2, 1, '2026-09-19 22:11:38', '2026-09-19 22:41:24'),
  (3, 'Tamanos', 'tamanos', 'Tamanos disponibles para bebidas y comidas', 'straighten', '#006b3f', 1, 0, 1, 3, 1, '2026-09-19 22:11:38', '2026-09-20 14:00:09'),
  (4, 'Metodos de Preparacion', 'metodos_preparacion', 'Formas de preparar las bebidas', 'science', '#9c4221', 0, 0, 1, 4, 1, '2026-09-19 22:11:38', '2026-09-19 22:41:24'),
  (5, 'Ingredientes Principales', 'ingredientes_principales', 'Base de ingredientes para recetas', 'eco', '#002b26', 0, 0, 1, 5, 1, '2026-09-19 22:11:38', '2026-09-19 22:41:24'),
  (6, 'Menu Cafe', 'menu_cafe', 'Productos principales del menu de cafe', 'local_cafe', '#543310', 0, 0, 1, 6, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (7, 'Proveedores', 'proveedores', 'Directorio de proveedores del cafe', 'local_shipping', '#0061a4', 0, 0, 1, 7, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (8, 'Mesas', 'mesas', 'Mesas y areas del local', 'table_restaurant', '#006b3f', 0, 0, 1, 8, 1, '2026-09-19 22:39:08', '2026-09-19 22:39:08'),
  (9, 'Tipo de Leche', 'tipo_leche', 'Alternativas de leche para bebidas', 'water_drop', '#543310', 1, 0, 1, 9, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (10, 'Temperatura', 'temperatura', 'Temperatura de la bebida', 'thermostat', '#0061a4', 1, 0, 1, 10, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (11, 'Extras', 'extras', 'Extras adicionales para bebidas', 'add_circle', '#006b3f', 1, 0, 3, 11, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09');

-- catalog_items (59 filas)
INSERT INTO `catalog_items` (`id`, `group_id`, `name`, `description`, `icon`, `color`, `parent_id`, `sort_order`, `price_adjustment`, `capacity`, `table_id`, `active`, `created_at`, `updated_at`) VALUES
  (1, 1, 'Bebidas Calientes', NULL, 'local_cafe', '#543310', NULL, 1, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (2, 1, 'Bebidas Frios', NULL, 'ice', '#0061a4', NULL, 2, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-20 00:07:31'),
  (3, 1, 'Comida', NULL, 'restaurant', '#006b3f', NULL, 3, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (4, 1, 'Postres', NULL, 'cake', '#9c4221', NULL, 4, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (5, 1, 'Alimentos', NULL, 'lunch_dining', '#543310', NULL, 5, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (6, 2, 'Espresso', NULL, 'coffee', '#543310', NULL, 1, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (7, 2, 'Filtrados', NULL, 'filter_drip', '#543310', NULL, 2, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (8, 2, 'Cold Brew', NULL, 'ac_unit', '#0061a4', NULL, 3, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (9, 2, 'Smoothies', NULL, 'blender', '#006b3f', NULL, 4, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (10, 2, 'Tes', NULL, 'spa', '#002b26', NULL, 5, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (11, 3, 'Pequeno (8oz)', NULL, 'size_small', NULL, NULL, 1, -4, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-20 14:00:09'),
  (12, 3, 'Mediano (12oz)', NULL, 'size_medium', NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (13, 3, 'Grande (16oz)', NULL, 'size_large', NULL, NULL, 3, 4, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-20 14:00:09'),
  (14, 3, 'Familiar (20oz)', NULL, 'sports_bar', NULL, NULL, 4, 8, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-20 14:00:09'),
  (15, 4, 'Italiano', NULL, 'machine', NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (16, 4, 'Americano', NULL, 'coffee', NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (17, 4, 'V60', NULL, 'architecture', NULL, NULL, 3, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (18, 4, 'Chemex', NULL, 'science', NULL, NULL, 4, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (19, 4, 'Aeropress', NULL, 'sports_mma', NULL, NULL, 5, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (20, 5, 'Cafe Arabica', NULL, 'coffee', '#543310', NULL, 1, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (21, 5, 'Leche Entera', NULL, 'water_drop', '#f5f5f5', NULL, 2, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (22, 5, 'Leche de Avena', NULL, 'grass', '#006b3f', NULL, 3, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (23, 5, 'Chocolate', NULL, 'cookie', '#9c4221', NULL, 4, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (24, 5, 'Vainilla', NULL, 'local_florist', '#9c4221', NULL, 5, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (25, 5, 'Matcha', NULL, 'eco', '#006b3f', NULL, 6, 0, 4, NULL, 1, '2026-09-19 22:11:38', '2026-09-19 22:11:38'),
  (26, 6, 'Espresso', NULL, 'coffee', '#543310', NULL, 1, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (27, 6, 'Cappuccino', NULL, 'local_cafe', '#543310', NULL, 2, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (28, 6, 'Latte', NULL, 'local_cafe', '#543310', NULL, 3, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (29, 6, 'Americano', NULL, 'coffee', '#543310', NULL, 4, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (30, 6, 'Mocha', NULL, 'local_cafe', '#9c4221', NULL, 5, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (31, 6, 'Cold Brew', NULL, 'ac_unit', '#0061a4', NULL, 6, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (32, 6, 'Matcha Latte', NULL, 'eco', '#006b3f', NULL, 7, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (33, 6, 'Chai Latte', NULL, 'spa', '#9c4221', NULL, 8, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (34, 7, 'Cafes del Valle S.A.', NULL, 'business', '#543310', NULL, 1, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (35, 7, 'Lacteos Frescos Ltda.', NULL, 'business', '#0061a4', NULL, 2, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (36, 7, 'Importaciones Gourmet', NULL, 'business', '#006b3f', NULL, 3, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (37, 7, 'Distribuidora de Granos', NULL, 'business', '#9c4221', NULL, 4, 0, 4, NULL, 0, '2026-09-19 22:39:08', '2026-09-22 00:29:00'),
  (38, 8, 'Mesa 1', NULL, 'table_restaurant', '#006b3f', NULL, 1, 0, 4, 1, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (39, 8, 'Mesa 2', NULL, 'table_restaurant', '#006b3f', NULL, 2, 0, 4, 2, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (40, 8, 'Mesa 3', NULL, 'table_restaurant', '#006b3f', NULL, 3, 0, 4, 3, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (41, 8, 'Terraza A', NULL, 'deck', '#543310', NULL, 4, 0, 4, 4, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (42, 8, 'Terraza B', NULL, 'deck', '#543310', NULL, 5, 0, 4, 5, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (43, 8, 'Barra Principal', NULL, 'countertops', '#0061a4', NULL, 6, 0, 6, 6, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (44, 8, 'Sala Privada', NULL, 'meeting_room', '#9c4221', NULL, 7, 0, 8, 7, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (45, 8, 'Area de Estudio', NULL, 'desk', '#002b26', NULL, 8, 0, 4, 8, 1, '2026-09-19 22:39:08', '2026-09-21 23:28:56'),
  (46, 9, 'Almendras', NULL, 'water_drop', NULL, NULL, 4, 5, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (47, 9, 'Avena', NULL, 'water_drop', NULL, NULL, 3, 4, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (48, 9, 'Coco', NULL, 'water_drop', NULL, NULL, 6, 5, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (49, 9, 'Deslactosada', NULL, 'water_drop', NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (50, 9, 'Entera', NULL, 'water_drop', NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (51, 9, 'Soya', NULL, 'water_drop', NULL, NULL, 5, 4, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (52, 10, 'Caliente', NULL, 'thermostat', NULL, NULL, 1, 0, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (53, 10, 'Frio', NULL, 'thermostat', NULL, NULL, 2, 0, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (54, 11, 'Avellana', NULL, 'add_circle', NULL, NULL, 4, 4, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (55, 11, 'Caramelo', NULL, 'add_circle', NULL, NULL, 3, 4, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (56, 11, 'Espuma Extra', NULL, 'add_circle', NULL, NULL, 6, 3, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (57, 11, 'Miel', NULL, 'add_circle', NULL, NULL, 5, 3, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (58, 11, 'Shot Extra', NULL, 'add_circle', NULL, NULL, 1, 6, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09'),
  (59, 11, 'Vainilla', NULL, 'add_circle', NULL, NULL, 2, 4, 4, NULL, 1, '2026-09-20 14:00:09', '2026-09-20 14:00:09');

-- products (21 filas)
INSERT INTO `products` (`id`, `name`, `category_id`, `category`, `price`, `cost`, `description`, `badge`, `sort_order`, `image`, `active`, `created_at`, `updated_at`) VALUES
  (1, 'Latte Vainilla', 1, NULL, 28, 8.5, 'Suave y aromatico con toque de vainilla', 'Popular', 1, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (2, 'Flat White Doble', 1, NULL, 26, 7.8, 'Doble espresso con microespuma sedosa', NULL, 2, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (3, 'Capuchino Clasico', 1, NULL, 25, 7.5, 'Espresso con espuma de leche en equilibrio', NULL, 3, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (4, 'Americano', 1, NULL, 20, 5, 'Espresso suave con agua caliente', NULL, 4, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (5, 'Espresso Doble', 1, NULL, 22, 6, 'Shot doble de espresso intenso', NULL, 5, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (6, 'Mocha Chocolate', 1, NULL, 30, 9, 'Espresso con chocolate belga y leche', 'Nuevo', 6, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (7, 'Cortado', 1, NULL, 18, 4.5, 'Espresso con un toque de leche', NULL, 7, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (8, 'Cold Brew Nitro', 2, NULL, 32, 9.2, 'Nitrogenizado y refrescante, 18h de extraccion', 'Top Seller', 8, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (9, 'Iced Latte', 2, NULL, 28, 8, 'Latte servido sobre hielo', NULL, 9, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (10, 'Frappe Mocha', 2, NULL, 35, 10, 'Batido frio con chocolate y crema batida', NULL, 10, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (11, 'Te Chai Frio', 2, NULL, 26, 7, 'Chai latte servido frio con canela', NULL, 11, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (12, 'Sandwich Club', 3, NULL, 65, 22, 'Pan de corteza, pollo, tocino, lechuga, tomate', NULL, 12, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (13, 'Baguette Jamon Queso', 3, NULL, 55, 18, 'Baguette francesa con jamon y queso gruyere', NULL, 13, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (14, 'Wrap Vegetariano', 3, NULL, 58, 17, 'Tortilla integral con vegetales frescos', NULL, 14, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (15, 'Croissant de Mantequilla', 4, NULL, 25, 7.5, 'Hojaldre crujiente con mantequilla francesa', NULL, 15, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (16, 'Muffin Arandanos', 4, NULL, 22, 6, 'Esponjoso con arandanos frescos', NULL, 16, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (17, 'Cheesecake', 4, NULL, 45, 14, 'Tela de queso cremosa con base de galleta', 'Popular', 17, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (18, 'Granola Bowl', 5, NULL, 48, 13, 'Granola artesanal con yogur y fruta fresca', NULL, 18, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (19, 'Tostadas Aguacate', 5, NULL, 52, 15, 'Pan integral con aguacate y semillas', 'Nuevo', 19, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (20, 'Acai Bowl', 5, NULL, 55, 16, 'Acai con granola, banana y frutos secos', NULL, 20, NULL, 1, '2026-09-19 23:33:34', '2026-09-19 23:33:34'),
  (21, 'croissant', 4, NULL, 25, 15, 'Pan relleno de carne', NULL, 0, 'f5de0d38-f14b-4917-ac68-ee367feb001c.webp', 1, '2026-09-20 12:16:48', '2026-09-20 12:16:48');

-- product_modifier_groups (24 filas)
INSERT INTO `product_modifier_groups` (`product_id`, `group_id`) VALUES
  (1, 3),
  (2, 3),
  (3, 3),
  (4, 3),
  (5, 3),
  (6, 3),
  (8, 3),
  (9, 3),
  (10, 3),
  (11, 3),
  (1, 9),
  (2, 9),
  (3, 9),
  (6, 9),
  (9, 9),
  (1, 10),
  (3, 10),
  (6, 10),
  (9, 10),
  (11, 10),
  (1, 11),
  (6, 11),
  (8, 11),
  (10, 11);

-- inventory (22 filas)
INSERT INTO `inventory` (`id`, `catalog_item_id`, `name`, `stock`, `unit`, `min_stock`, `cost_per_unit`, `supplier_id`, `created_at`, `updated_at`) VALUES
  (7, 20, 'Cafe en Granos', 59.85, 'kg', 10, 42, NULL, '2026-09-21 22:04:11', '2026-09-22 11:06:57'),
  (8, 21, 'Leche Entera', 118.3, 'litros', 20, 8, NULL, '2026-09-21 22:04:11', '2026-09-22 11:06:57'),
  (9, 22, 'Leche de Avena', 50, 'litros', 10, 12, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (10, 24, 'Vainilla', 470, 'ml', 100, 0.5, NULL, '2026-09-21 22:04:11', '2026-09-21 22:08:41'),
  (11, 23, 'Chocolate en Polvo', 5, 'kg', 1, 35, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (12, 25, 'Matcha', 2, 'kg', 0.5, 85, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (13, NULL, 'Croissant de Mantequilla', 57, 'piezas', 12, 6, NULL, '2026-09-21 22:04:11', '2026-09-22 10:48:03'),
  (14, NULL, 'Muffin de Arandanos', 40, 'piezas', 8, 7, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (15, NULL, 'Rebanada de Cheesecake', 20, 'piezas', 4, 12, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (16, NULL, 'Tortilla Integral', 49, 'piezas', 10, 2.5, NULL, '2026-09-21 22:04:11', '2026-09-22 11:13:52'),
  (17, NULL, 'Pan de Sandwich', 40, 'piezas', 10, 3, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (18, NULL, 'Baguette', 30, 'piezas', 6, 5, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (19, NULL, 'Jamon', 5, 'kg', 1, 65, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (20, NULL, 'Queso Oaxaca', 4, 'kg', 1, 70, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (21, NULL, 'Aguacate', 19.5, 'piezas', 4, 15, NULL, '2026-09-21 22:04:11', '2026-09-22 11:13:52'),
  (22, NULL, 'Crema Agria', 2.95, 'litros', 1, 18, NULL, '2026-09-21 22:04:11', '2026-09-22 11:13:52'),
  (23, NULL, 'Acai Pure', 8, 'kg', 2, 90, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (24, NULL, 'Granola', 6, 'kg', 1.5, 30, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (25, NULL, 'Fruta Fresca (mix)', 5, 'kg', 1, 40, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (26, NULL, 'Chai Concentrado', 4, 'litros', 1, 55, NULL, '2026-09-21 22:04:11', '2026-09-21 22:04:11'),
  (27, NULL, 'Helado de Vainilla', 7.9, 'kg', 2, 45, NULL, '2026-09-21 22:04:11', '2026-09-22 11:06:57'),
  (28, NULL, 'Frappuccion Mocha', 2.98, 'kg', 1, 60, NULL, '2026-09-21 22:04:11', '2026-09-22 11:06:57');

-- recipes (46 filas)
INSERT INTO `recipes` (`id`, `product_id`, `inventory_id`, `quantity_per_unit`, `unit`) VALUES
  (1, 1, 7, 0.018, 'kg'),
  (2, 1, 8, 0.3, 'litros'),
  (3, 1, 10, 15, 'ml'),
  (4, 2, 7, 0.024, 'kg'),
  (5, 2, 8, 0.25, 'litros'),
  (6, 3, 7, 0.018, 'kg'),
  (7, 3, 8, 0.2, 'litros'),
  (8, 4, 7, 0.018, 'kg'),
  (9, 5, 7, 0.018, 'kg'),
  (10, 6, 7, 0.018, 'kg'),
  (11, 6, 8, 0.25, 'litros'),
  (12, 6, 11, 0.02, 'kg'),
  (13, 7, 7, 0.018, 'kg'),
  (14, 7, 8, 0.05, 'litros'),
  (15, 8, 7, 0.03, 'kg'),
  (16, 9, 7, 0.018, 'kg'),
  (17, 9, 8, 0.3, 'litros'),
  (18, 10, 7, 0.018, 'kg'),
  (19, 10, 8, 0.15, 'litros'),
  (20, 10, 27, 0.1, 'kg'),
  (21, 10, 28, 0.02, 'kg'),
  (22, 11, 8, 0.2, 'litros'),
  (23, 11, 26, 0.1, 'litros'),
  (24, 15, 13, 1, 'piezas'),
  (25, 16, 14, 1, 'piezas'),
  (26, 17, 15, 1, 'piezas'),
  (27, 12, 17, 2, 'piezas'),
  (28, 12, 19, 0.08, 'kg'),
  (29, 12, 20, 0.06, 'kg'),
  (30, 12, 21, 0.5, 'piezas'),
  (31, 13, 18, 1, 'piezas'),
  (32, 13, 19, 0.1, 'kg'),
  (33, 13, 20, 0.08, 'kg'),
  (34, 14, 16, 1, 'piezas'),
  (35, 14, 21, 0.5, 'piezas'),
  (36, 14, 22, 0.05, 'litros'),
  (37, 18, 24, 0.08, 'kg'),
  (38, 18, 8, 0.1, 'litros'),
  (39, 18, 25, 0.15, 'kg'),
  (40, 19, 16, 2, 'piezas'),
  (41, 19, 21, 0.5, 'piezas'),
  (42, 19, 22, 0.05, 'litros'),
  (43, 20, 23, 0.2, 'kg'),
  (44, 20, 24, 0.06, 'kg'),
  (45, 20, 25, 0.1, 'kg'),
  (49, 21, 13, 1, 'piezas');

-- suppliers (3 filas)
INSERT INTO `suppliers` (`id`, `name`, `contact_name`, `phone`, `email`, `address`, `status`, `notes`, `created_at`, `updated_at`) VALUES
  (1, 'Cafes del Valle S.A.', 'Roberto Mendez', '+502 5555-0101', 'ventas@cafesdelvalle.com', 'Zona 10, Guatemala', 'Activo', NULL, '2026-09-21 22:55:10', '2026-09-21 22:55:10'),
  (2, 'Lacteos Frescos Ltda.', 'Maria Garcia', '+502 5555-0102', 'pedidos@lacteosfrescos.com', 'Carretera a El Salvador', 'Activo', NULL, '2026-09-21 22:55:10', '2026-09-21 22:55:10'),
  (3, 'Importaciones Gourmet', 'Carlos Ruiz', '+502 5555-0103', 'info@importacionesgourmet.com', 'Zona 4, Guatemala', 'Activo', NULL, '2026-09-21 22:55:10', '2026-09-21 22:55:10');

-- tables (8 filas)
INSERT INTO `tables` (`id`, `name`, `capacity`, `status`, `current_order_id`, `created_at`) VALUES
  (1, 'Mesa 1', 4, 'free', NULL, '2026-09-20 15:45:13'),
  (2, 'Mesa 2', 4, 'free', NULL, '2026-09-20 15:45:13'),
  (3, 'Mesa 3', 4, 'free', NULL, '2026-09-20 15:45:13'),
  (4, 'Terraza A', 4, 'free', NULL, '2026-09-20 15:45:13'),
  (5, 'Terraza B', 4, 'free', NULL, '2026-09-20 15:45:13'),
  (6, 'Barra Principal', 6, 'free', NULL, '2026-09-20 15:45:13'),
  (7, 'Sala Privada', 8, 'free', NULL, '2026-09-20 15:45:13'),
  (8, 'Area de Estudio', 4, 'free', NULL, '2026-09-20 15:45:13');

SET FOREIGN_KEY_CHECKS = 1;