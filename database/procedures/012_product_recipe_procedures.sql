-- ============================================
-- Producto obligatorio con receta (insumo -> receta -> producto)
-- ============================================
USE comandapro;

-- Listar productos incluyendo el numero de insumos de su receta
DROP PROCEDURE IF EXISTS sp_list_products;
DELIMITER //
CREATE PROCEDURE sp_list_products(IN p_category_id INT)
BEGIN
    IF p_category_id IS NULL THEN
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active,
               (SELECT COUNT(*) FROM recipes r WHERE r.product_id = p.id) AS recipe_count
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.active = TRUE
        ORDER BY p.sort_order, p.name;
    ELSE
        SELECT p.id, p.name, p.category_id, ci.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image,
               p.sort_order, p.active,
               (SELECT COUNT(*) FROM recipes r WHERE r.product_id = p.id) AS recipe_count
        FROM products p
        LEFT JOIN catalog_items ci ON p.category_id = ci.id
        WHERE p.category_id = p_category_id AND p.active = TRUE
        ORDER BY p.sort_order, p.name;
    END IF;
END //
DELIMITER ;

-- Actualizar producto (devuelve filas afectadas)
DROP PROCEDURE IF EXISTS sp_update_product;
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
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Definir la receta completa de un producto (reemplaza la existente).
-- Requiere al menos un insumo. Se usa al crear/editar un producto.
DROP PROCEDURE IF EXISTS sp_set_product_recipe;
DELIMITER //
CREATE PROCEDURE sp_set_product_recipe(
    IN p_product_id INT,
    IN p_items JSON
)
BEGIN
    DECLARE v_items_count INT DEFAULT 0;
    DECLARE v_valid_count INT DEFAULT 0;

    IF p_items IS NULL OR JSON_LENGTH(p_items) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El producto debe tener al menos un insumo en su receta';
    END IF;

    SET v_items_count = JSON_LENGTH(p_items);

    -- Validar que todos los insumos existan
    SELECT COUNT(*) INTO v_valid_count
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
        inventory_id INT PATH '$.inventory_id',
        quantity DECIMAL(10,3) PATH '$.quantity'
    )) j
    JOIN inventory i ON i.id = j.inventory_id;

    IF v_valid_count <> v_items_count THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Uno o mas insumos no existen';
    END IF;

    -- Reemplazar la receta del producto
    DELETE FROM recipes WHERE product_id = p_product_id;

    INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
    SELECT p_product_id, j.inventory_id, j.quantity, COALESCE(j.unit, i.unit)
    FROM JSON_TABLE(p_items, '$[*]' COLUMNS (
        inventory_id INT PATH '$.inventory_id',
        quantity DECIMAL(10,3) PATH '$.quantity',
        unit VARCHAR(20) PATH '$.unit'
    )) j
    JOIN inventory i ON i.id = j.inventory_id;

    SELECT p_product_id AS product_id, v_items_count AS recipe_items;
END //
DELIMITER ;
