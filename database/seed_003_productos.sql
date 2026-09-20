-- ============================================
-- FASE 2: Datos semilla - Productos del Menu
-- ============================================
USE comandapro;

-- Productos: Bebidas Calientes (category_id = 1)
INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order) VALUES
('Latte Vainilla', 1, 28.00, 8.50, 'Suave y aromatico con toque de vainilla', 'Popular', NULL, 1),
('Flat White Doble', 1, 26.00, 7.80, 'Doble espresso con microespuma sedosa', NULL, NULL, 2),
('Capuchino Clasico', 1, 25.00, 7.50, 'Espresso con espuma de leche en equilibrio', NULL, NULL, 3),
('Americano', 1, 20.00, 5.00, 'Espresso suave con agua caliente', NULL, NULL, 4),
('Espresso Doble', 1, 22.00, 6.00, 'Shot doble de espresso intenso', NULL, NULL, 5),
('Mocha Chocolate', 1, 30.00, 9.00, 'Espresso con chocolate belga y leche', 'Nuevo', NULL, 6),
('Cortado', 1, 18.00, 4.50, 'Espresso con un toque de leche', NULL, NULL, 7);

-- Productos: Bebidas Frias (category_id = 2)
INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order) VALUES
('Cold Brew Nitro', 2, 32.00, 9.20, 'Nitrogenizado y refrescante, 18h de extraccion', 'Top Seller', NULL, 8),
('Iced Latte', 2, 28.00, 8.00, 'Latte servido sobre hielo', NULL, NULL, 9),
('Frappe Mocha', 2, 35.00, 10.00, 'Batido frio con chocolate y crema batida', NULL, NULL, 10),
('Te Chai Frio', 2, 26.00, 7.00, 'Chai latte servido frio con canela', NULL, NULL, 11);

-- Productos: Comida (category_id = 3)
INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order) VALUES
('Sandwich Club', 3, 65.00, 22.00, 'Pan de corteza, pollo, tocino, lechuga, tomate', NULL, NULL, 12),
('Baguette Jamon Queso', 3, 55.00, 18.00, 'Baguette francesa con jamon y queso gruyere', NULL, NULL, 13),
('Wrap Vegetariano', 3, 58.00, 17.00, 'Tortilla integral con vegetales frescos', NULL, NULL, 14);

-- Productos: Postres (category_id = 4)
INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order) VALUES
('Croissant de Mantequilla', 4, 25.00, 7.50, 'Hojaldre crujiente con mantequilla francesa', NULL, NULL, 15),
('Muffin Arandanos', 4, 22.00, 6.00, 'Esponjoso con arandanos frescos', NULL, NULL, 16),
('Cheesecake', 4, 45.00, 14.00, 'Tela de queso cremosa con base de galleta', 'Popular', NULL, 17);

-- Productos: Alimentos (category_id = 5)
INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order) VALUES
('Granola Bowl', 5, 48.00, 13.00, 'Granola artesanal con yogur y fruta fresca', NULL, NULL, 18),
('Tostadas Aguacate', 5, 52.00, 15.00, 'Pan integral con aguacate y semillas', 'Nuevo', NULL, 19),
('Acai Bowl', 5, 55.00, 16.00, 'Acai con granola, banana y frutos secos', NULL, NULL, 20);
