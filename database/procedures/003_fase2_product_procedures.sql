-- ============================================
-- FASE 2: Procedimientos Almacenados - Productos
-- ============================================
USE comandapro;

-- Listar productos (filtro por categoria opcional)
DELIMITER //
CREATE PROCEDURE sp_list_products(IN p_category_id INT)
BEGIN
    IF p_category_id IS NULL THEN
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.active = TRUE
        ORDER BY p.sort_order, p.name;
    ELSE
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.category_id = p_category_id AND p.active = TRUE
        ORDER BY p.sort_order, p.name;
    END IF;
END //
DELIMITER ;

-- Obtener producto por ID
DELIMITER //
CREATE PROCEDURE sp_get_product(IN p_id INT)
BEGIN
    SELECT p.id, p.name, p.category_id, ci.name AS category_name,
           p.price, p.cost, p.description, p.badge, p.image,
           p.sort_order, p.active
    FROM products p
    LEFT JOIN catalog_items ci ON p.category_id = ci.id
    WHERE p.id = p_id;
END //
DELIMITER ;

-- Crear producto
DELIMITER //
CREATE PROCEDURE sp_create_product(
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255),
    IN p_sort_order INT
)
BEGIN
    INSERT INTO products (name, category_id, price, cost, description, badge, image, sort_order)
    VALUES (p_name, p_category_id, p_price, p_cost, p_description, p_badge, p_image, p_sort_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar producto
DELIMITER //
CREATE PROCEDURE sp_update_product(
    IN p_id INT,
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255),
    IN p_sort_order INT,
    IN p_active BOOLEAN
)
BEGIN
    UPDATE products
    SET name = p_name, category_id = p_category_id, price = p_price,
        cost = p_cost, description = p_description, badge = p_badge,
        image = p_image, sort_order = p_sort_order, active = p_active
    WHERE id = p_id;
END //
DELIMITER ;

-- Eliminar producto (soft delete)
DELIMITER //
CREATE PROCEDURE sp_delete_product(IN p_id INT)
BEGIN
    UPDATE products SET active = FALSE WHERE id = p_id AND active = TRUE;
END //
DELIMITER ;

-- Contar productos por categoria
DELIMITER //
CREATE PROCEDURE sp_count_products_by_category()
BEGIN
    SELECT category_id, COUNT(*) AS product_count
    FROM products
    WHERE active = TRUE AND category_id IS NOT NULL
    GROUP BY category_id;
END //
DELIMITER ;
