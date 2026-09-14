-- ============================================
-- ComandaPro - Datos Semilla
-- ============================================
USE comandapro;

-- ============================================
-- Usuarios
-- ============================================
INSERT INTO users (username, password, name, email, role) VALUES
('admin', 'admin123', 'Ana Lopez', 'ana@comandapro.com', 'Administrador'),
('mateo', 'barista123', 'Mateo Rodriguez', 'mateo@comandapro.com', 'Barista');

-- ============================================
-- Productos
-- ============================================
INSERT INTO products (name, category, price, cost, modifier_groups) VALUES
('Latte Vainilla', 'Café Caliente', 28.00, 8.50, '["milk", "size", "temp", "extras"]'),
('Flat White Doble', 'Café Caliente', 26.00, 7.80, '["milk", "size"]'),
('Cold Brew Nitro', 'Fríos', 32.00, 9.20, '["size", "extras"]'),
('Croissant de Almendra', 'Pastelería', 22.00, 6.50, '[]'),
('Espresso Doble Oaxaca', 'Café Caliente', 18.00, 4.20, '["size"]'),
('V60 Origen Único', 'Café Caliente', 45.00, 14.00, '["temp"]'),
('Capuchino Clásico', 'Café Caliente', 24.00, 7.00, '["milk", "size", "temp", "extras"]'),
('Matcha Latte', 'Tés', 30.00, 10.50, '["milk", "size", "temp", "extras"]'),
('Té Chai Especiado', 'Tés', 22.00, 5.80, '["milk", "size", "temp", "extras"]'),
('Moka Clásico', 'Café Caliente', 26.00, 7.50, '["milk", "size", "temp", "extras"]'),
('Frío de Maracuyá', 'Fríos', 28.00, 6.80, '["size", "extras"]'),
('Croissant de Mantequilla', 'Pastelería', 16.00, 4.00, '[]'),
('Baguette de Pan', 'Pastelería', 18.00, 3.50, '[]'),
('Granos Árabe (250g)', 'Retail', 85.00, 42.00, '[]'),
('Papel de Filtro (x100)', 'Retail', 45.00, 18.00, '[]');

-- ============================================
-- Modificadores
-- ============================================
INSERT INTO modifiers (group_name, option_name, price) VALUES
-- Tipo de Leche
('milk', 'Entera', 0),
('milk', 'Deslactosada', 0),
('milk', 'Avena', 4),
('milk', 'Almendras', 5),
('milk', 'Soya', 4),
('milk', 'Coco', 5),
-- Tamaño
('size', 'Chico 8oz', -4),
('size', 'Mediano 12oz', 0),
('size', 'Grande 16oz', 4),
-- Temperatura
('temp', 'Caliente', 0),
('temp', 'Frío', 0),
-- Extras
('extras', 'Shot Extra', 6),
('extras', 'Vainilla', 4),
('extras', 'Caramelo', 4),
('extras', 'Avellana', 4),
('extras', 'Miel', 3),
('extras', 'Espuma Extra', 3);

-- ============================================
-- Inventario
-- ============================================
INSERT INTO inventory (name, quantity, unit, min_stock) VALUES
('Café en Granos', 50, 'kg', 10),
('Leche Entera', 100, 'litros', 20),
('Leche de Avena', 50, 'litros', 10),
('Vainilla', 500, 'ml', 100),
('Chocolate en Polvo', 5, 'kg', 1),
('Matcha', 2, 'kg', 0.5),
('Almendra Fileteada', 3, 'kg', 0.5),
('Hojaldre', 50, 'unidades', 10),
('Pan Baguette', 30, 'unidades', 5),
('Filtros V60', 200, 'unidades', 50),
('Maracuyá Pulp', 10, 'litros', 2),
('Menta Fresca', 2, 'manojos', 0.5);

-- ============================================
-- Proveedores
-- ============================================
INSERT INTO suppliers (name, contact_name, phone, email) VALUES
('Cafés del Valle S.A.', 'Roberto Méndez', '+502 5555-0101', 'ventas@cafesdelvalle.com'),
('Lácteos Frescos Ltda.', 'María García', '+502 5555-0102', 'pedidos@lacteosfrescos.com'),
('Importaciones Gourmet', 'Carlos Ruiz', '+502 5555-0103', 'info@importacionesgourmet.com');

-- ============================================
-- Mesas
-- ============================================
INSERT INTO tables (name, capacity) VALUES
('Mesa 1', 2), ('Mesa 2', 2), ('Mesa 3', 2), ('Mesa 4', 2),
('Mesa 5', 4), ('Mesa 6', 4), ('Mesa 7', 4), ('Mesa 8', 4),
('Mesa 9', 6), ('Mesa 10', 6), ('Mesa 11', 6), ('Mesa 12', 6);

-- ============================================
-- Recetas (Producto → Ingredientes)
-- ============================================
INSERT INTO recipes (product_id, inventory_id, quantity, unit) VALUES
-- Latte Vainilla (id: 1)
(1, 1, 0.018, 'kg'),    -- Café en Granos
(1, 2, 0.25, 'litros'), -- Leche Entera
(1, 4, 15, 'ml'),       -- Vainilla
-- Flat White Doble (id: 2)
(2, 1, 0.02, 'kg'),     -- Café en Granos
(2, 2, 0.2, 'litros'),  -- Leche Entera
-- Cold Brew Nitro (id: 3)
(3, 1, 0.03, 'kg'),     -- Café en Granos
-- Croissant de Almendra (id: 4)
(4, 7, 0.02, 'kg'),     -- Almendra Fileteada
(4, 8, 1, 'unidades'),  -- Hojaldre
-- Espresso Doble Oaxaca (id: 5)
(5, 1, 0.018, 'kg'),    -- Café en Granos
-- V60 Origen Único (id: 6)
(6, 1, 0.025, 'kg'),    -- Café en Granos
(6, 10, 1, 'unidades'), -- Filtros V60
-- Capuchino Clásico (id: 7)
(7, 1, 0.018, 'kg'),    -- Café en Granos
(7, 2, 0.2, 'litros'),  -- Leche Entera
-- Matcha Latte (id: 8)
(8, 6, 0.005, 'kg'),    -- Matcha
(8, 2, 0.25, 'litros'), -- Leche Entera
-- Té Chai Especiado (id: 9)
(9, 2, 0.2, 'litros'),  -- Leche Entera
-- Moka Clásico (id: 10)
(10, 1, 0.018, 'kg'),   -- Café en Granos
(10, 2, 0.2, 'litros'), -- Leche Entera
(10, 5, 0.01, 'kg'),    -- Chocolate en Polvo
-- Frío de Maracuyá (id: 11)
(11, 11, 0.1, 'litros'), -- Maracuyá Pulp
-- Croissant de Mantequilla (id: 12)
(12, 8, 1, 'unidades'),  -- Hojaldre
-- Baguette de Pan (id: 13)
(13, 9, 1, 'unidades');  -- Pan Baguette
