USE comandapro;

INSERT IGNORE INTO catalog_groups (id, name, slug, description, icon, color, sort_order) VALUES
(6, 'Menu Cafe', 'menu_cafe', 'Productos principales del menu de cafe', 'local_cafe', '#543310', 6),
(7, 'Proveedores', 'proveedores', 'Directorio de proveedores del cafe', 'local_shipping', '#0061a4', 7),
(8, 'Mesas', 'mesas', 'Mesas y areas del local', 'table_restaurant', '#006b3f', 8);

INSERT IGNORE INTO catalog_items (id, group_id, name, icon, color, sort_order) VALUES
(26, 6, 'Espresso', 'coffee', '#543310', 1),
(27, 6, 'Cappuccino', 'local_cafe', '#543310', 2),
(28, 6, 'Latte', 'local_cafe', '#543310', 3),
(29, 6, 'Americano', 'coffee', '#543310', 4),
(30, 6, 'Mocha', 'local_cafe', '#9c4221', 5),
(31, 6, 'Cold Brew', 'ac_unit', '#0061a4', 6),
(32, 6, 'Matcha Latte', 'eco', '#006b3f', 7),
(33, 6, 'Chai Latte', 'spa', '#9c4221', 8),
(34, 7, 'Cafes del Valle S.A.', 'business', '#543310', 1),
(35, 7, 'Lacteos Frescos Ltda.', 'business', '#0061a4', 2),
(36, 7, 'Importaciones Gourmet', 'business', '#006b3f', 3),
(37, 7, 'Distribuidora de Granos', 'business', '#9c4221', 4),
(38, 8, 'Mesa 1', 'table_restaurant', '#006b3f', 1),
(39, 8, 'Mesa 2', 'table_restaurant', '#006b3f', 2),
(40, 8, 'Mesa 3', 'table_restaurant', '#006b3f', 3),
(41, 8, 'Terraza A', 'deck', '#543310', 4),
(42, 8, 'Terraza B', 'deck', '#543310', 5),
(43, 8, 'Barra Principal', 'countertops', '#0061a4', 6),
(44, 8, 'Sala Privada', 'meeting_room', '#9c4221', 7),
(45, 8, 'Area de Estudio', 'desk', '#002b26', 8);
