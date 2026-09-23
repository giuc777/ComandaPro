-- ============================================
-- FASE 7: Procedimientos de Inventario y Recetas
-- ============================================
USE comandapro;

-- ============================================
-- INVENTARIO
-- ============================================

-- Listar inventario (filtro stock bajo opcional)
DROP PROCEDURE IF EXISTS sp_list_inventory;
DELIMITER //
CREATE PROCEDURE sp_list_inventory(IN p_low_stock_only BOOLEAN)
BEGIN
    IF p_low_stock_only = TRUE THEN
        SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
               i.cost_per_unit, s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.stock <= i.min_stock
        ORDER BY i.name;
    ELSE
        SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
               i.cost_per_unit, s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.name;
    END IF;
END //
DELIMITER ;

-- Obtener insumo por ID
DROP PROCEDURE IF EXISTS sp_get_inventory_item;
DELIMITER //
CREATE PROCEDURE sp_get_inventory_item(IN p_id INT)
BEGIN
    SELECT i.id, i.catalog_item_id, i.name, i.unit, i.stock, i.min_stock,
           i.cost_per_unit, i.supplier_id, s.name AS supplier_name,
           ci.name AS catalog_item_name,
           CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
    FROM inventory i
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    LEFT JOIN catalog_items ci ON i.catalog_item_id = ci.id
    WHERE i.id = p_id;
END //
DELIMITER ;

-- Crear insumo vinculado al catalogo de ingredientes
DROP PROCEDURE IF EXISTS sp_create_inventory_item;
DELIMITER //
CREATE PROCEDURE sp_create_inventory_item(
    IN p_catalog_item_id INT,
    IN p_name VARCHAR(100),
    IN p_unit VARCHAR(20),
    IN p_stock DECIMAL(10,3),
    IN p_min_stock DECIMAL(10,3),
    IN p_cost_per_unit DECIMAL(10,2),
    IN p_supplier_id INT
)
BEGIN
    DECLARE v_valid INT DEFAULT 0;

    -- Validar que el item de catalogo pertenece a ingredientes_principales
    IF p_catalog_item_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_valid
        FROM catalog_items ci
        JOIN catalog_groups cg ON ci.group_id = cg.id
        WHERE ci.id = p_catalog_item_id AND cg.slug = 'ingredientes_principales';
    ELSE
        SET v_valid = 1;
    END IF;

    IF v_valid = 1 THEN
        INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id)
        VALUES (p_catalog_item_id, p_name, p_unit, p_stock, p_min_stock, p_cost_per_unit, p_supplier_id);
        SELECT LAST_INSERT_ID() AS id;
    ELSE
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'catalog_item_id no pertenece a ingredientes_principales';
    END IF;
END //
DELIMITER ;

-- Actualizar insumo
DROP PROCEDURE IF EXISTS sp_update_inventory_item;
DELIMITER //
CREATE PROCEDURE sp_update_inventory_item(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_unit VARCHAR(20),
    IN p_min_stock DECIMAL(10,3),
    IN p_cost_per_unit DECIMAL(10,2),
    IN p_supplier_id INT
)
BEGIN
    UPDATE inventory
    SET name = p_name,
        unit = p_unit,
        min_stock = p_min_stock,
        cost_per_unit = p_cost_per_unit,
        supplier_id = p_supplier_id
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Actualizar stock manual (conteo fisico / mermas)
DROP PROCEDURE IF EXISTS sp_update_stock;
DELIMITER //
CREATE PROCEDURE sp_update_stock(IN p_inventory_id INT, IN p_new_stock DECIMAL(10,3))
BEGIN
    UPDATE inventory SET stock = p_new_stock WHERE id = p_inventory_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar insumo (solo si no tiene recetas activas)
DROP PROCEDURE IF EXISTS sp_delete_inventory_item;
DELIMITER //
CREATE PROCEDURE sp_delete_inventory_item(IN p_id INT)
BEGIN
    DECLARE v_recipe_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_recipe_count FROM recipes WHERE inventory_id = p_id;

    IF v_recipe_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede eliminar: el insumo tiene recetas activas';
    ELSE
        DELETE FROM inventory WHERE id = p_id;
        SELECT ROW_COUNT() AS affected;
    END IF;
END //
DELIMITER ;

-- ============================================
-- RECETAS
-- ============================================

-- Obtener receta de un producto
DROP PROCEDURE IF EXISTS sp_get_product_recipe;
DELIMITER //
CREATE PROCEDURE sp_get_product_recipe(IN p_product_id INT)
BEGIN
    SELECT r.id, r.inventory_id, i.name AS ingredient_name,
           i.unit AS ingredient_unit, r.quantity_per_unit, i.stock,
           i.cost_per_unit,
           (r.quantity_per_unit * i.cost_per_unit) AS line_cost
    FROM recipes r
    JOIN inventory i ON r.inventory_id = i.id
    WHERE r.product_id = p_product_id
    ORDER BY i.name;
END //
DELIMITER ;

-- Costo calculado del producto desde su receta
DROP PROCEDURE IF EXISTS sp_product_recipe_cost;
DELIMITER //
CREATE PROCEDURE sp_product_recipe_cost(IN p_product_id INT)
BEGIN
    SELECT p.id, p.name, p.cost AS stated_cost,
           COALESCE(SUM(r.quantity_per_unit * i.cost_per_unit), 0) AS recipe_cost
    FROM products p
    LEFT JOIN recipes r ON r.product_id = p.id
    LEFT JOIN inventory i ON r.inventory_id = i.id
    WHERE p.id = p_product_id
    GROUP BY p.id, p.name, p.cost;
END //
DELIMITER ;

-- Agregar / actualizar ingrediente en la receta de un producto
DROP PROCEDURE IF EXISTS sp_upsert_recipe_item;
DELIMITER //
CREATE PROCEDURE sp_upsert_recipe_item(
    IN p_product_id INT,
    IN p_inventory_id INT,
    IN p_quantity_per_unit DECIMAL(10,3),
    IN p_unit VARCHAR(20)
)
BEGIN
    INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
    VALUES (p_product_id, p_inventory_id, p_quantity_per_unit, p_unit)
    ON DUPLICATE KEY UPDATE
        quantity_per_unit = p_quantity_per_unit,
        unit = p_unit;
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Quitar ingrediente de la receta
DROP PROCEDURE IF EXISTS sp_delete_recipe_item;
DELIMITER //
CREATE PROCEDURE sp_delete_recipe_item(IN p_recipe_id INT)
BEGIN
    DELETE FROM recipes WHERE id = p_recipe_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- ============================================
-- DEDUCCION DE INVENTARIO (interna, se llama desde el pago)
-- ============================================

-- Deducir inventario al cobrar (OBLIGATORIO)
-- Se llama DENTRO de la transaccion de pago.
-- Si algun producto no tiene receta -> SIGNAL y rollback del cobro.
DROP PROCEDURE IF EXISTS sp_deduct_inventory;
DELIMITER //
CREATE PROCEDURE sp_deduct_inventory(IN p_order_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_product_id INT;
    DECLARE v_quantity INT;
    DECLARE v_has_recipe INT;

    DECLARE cur CURSOR FOR
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_product_id, v_quantity;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        -- Validar que el producto tenga al menos un ingrediente en su receta
        SELECT COUNT(*) INTO v_has_recipe FROM recipes WHERE product_id = v_product_id;
        IF v_has_recipe = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Producto sin receta: no se puede deducir inventario';
        END IF;

        -- Deducir cada ingrediente de la receta
        UPDATE inventory inv
        JOIN recipes r ON r.inventory_id = inv.id
        SET inv.stock = inv.stock - (r.quantity_per_unit * v_quantity)
        WHERE r.product_id = v_product_id;

    END LOOP read_loop;
    CLOSE cur;
END //
DELIMITER ;
