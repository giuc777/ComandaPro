-- ============================================
-- FASE 3: Procedimientos Almacenados - Modificadores
-- ============================================
USE comandapro;

-- ============================================
-- GRUPOS
-- ============================================

-- Listar todos los grupos de modificadores
DELIMITER //
CREATE PROCEDURE sp_list_modifier_groups()
BEGIN
    SELECT mg.id, mg.name, mg.required, mg.max_selections,
           mg.display_order, mg.active,
           (SELECT COUNT(*) FROM modifier_options mo WHERE mo.group_id = mg.id AND mo.active = TRUE) AS option_count
    FROM modifier_groups mg
    WHERE mg.active = TRUE
    ORDER BY mg.display_order, mg.name;
END //
DELIMITER ;

-- Obtener un grupo por ID
DELIMITER //
CREATE PROCEDURE sp_get_modifier_group(IN p_id INT)
BEGIN
    SELECT mg.id, mg.name, mg.required, mg.max_selections,
           mg.display_order, mg.active
    FROM modifier_groups mg
    WHERE mg.id = p_id;
END //
DELIMITER ;

-- Crear grupo de modificadores
DELIMITER //
CREATE PROCEDURE sp_create_modifier_group(
    IN p_name VARCHAR(50),
    IN p_required BOOLEAN,
    IN p_max_selections INT,
    IN p_display_order INT
)
BEGIN
    INSERT INTO modifier_groups (name, required, max_selections, display_order)
    VALUES (p_name, p_required, p_max_selections, p_display_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar grupo de modificadores
DELIMITER //
CREATE PROCEDURE sp_update_modifier_group(
    IN p_id INT,
    IN p_name VARCHAR(50),
    IN p_required BOOLEAN,
    IN p_max_selections INT,
    IN p_display_order INT,
    IN p_active BOOLEAN
)
BEGIN
    UPDATE modifier_groups
    SET name = p_name, required = p_required, max_selections = p_max_selections,
        display_order = p_display_order, active = p_active
    WHERE id = p_id;
END //
DELIMITER ;

-- Eliminar grupo (soft delete)
DELIMITER //
CREATE PROCEDURE sp_delete_modifier_group(IN p_id INT)
BEGIN
    UPDATE modifier_groups SET active = FALSE WHERE id = p_id AND active = TRUE;
END //
DELIMITER ;

-- ============================================
-- OPCIONES
-- ============================================

-- Listar opciones de un grupo
DELIMITER //
CREATE PROCEDURE sp_list_modifier_options(IN p_group_id INT)
BEGIN
    SELECT mo.id, mo.group_id, mo.name, mo.price_adjustment,
           mo.display_order, mo.active
    FROM modifier_options mo
    WHERE mo.group_id = p_group_id AND mo.active = TRUE
    ORDER BY mo.display_order, mo.name;
END //
DELIMITER ;

-- Crear opcion de modificador
DELIMITER //
CREATE PROCEDURE sp_create_modifier_option(
    IN p_group_id INT,
    IN p_name VARCHAR(100),
    IN p_price_adjustment DECIMAL(10,2),
    IN p_display_order INT
)
BEGIN
    INSERT INTO modifier_options (group_id, name, price_adjustment, display_order)
    VALUES (p_group_id, p_name, p_price_adjustment, p_display_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar opcion de modificador
DELIMITER //
CREATE PROCEDURE sp_update_modifier_option(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_price_adjustment DECIMAL(10,2),
    IN p_display_order INT,
    IN p_active BOOLEAN
)
BEGIN
    UPDATE modifier_options
    SET name = p_name, price_adjustment = p_price_adjustment,
        display_order = p_display_order, active = p_active
    WHERE id = p_id;
END //
DELIMITER ;

-- Eliminar opcion (soft delete)
DELIMITER //
CREATE PROCEDURE sp_delete_modifier_option(IN p_id INT)
BEGIN
    UPDATE modifier_options SET active = FALSE WHERE id = p_id AND active = TRUE;
END //
DELIMITER ;

-- ============================================
-- PRODUCTOS <-> MODIFICADORES
-- ============================================

-- Obtener modificadores asignados a un producto
DELIMITER //
CREATE PROCEDURE sp_get_product_modifiers(IN p_product_id INT)
BEGIN
    SELECT mg.id AS group_id, mg.name AS group_name, mg.required, mg.max_selections,
           mo.id AS option_id, mo.name AS option_name, mo.price_adjustment
    FROM product_modifier_groups pmg
    JOIN modifier_groups mg ON pmg.group_id = mg.id
    LEFT JOIN modifier_options mo ON mg.id = mo.group_id AND mo.active = TRUE
    WHERE pmg.product_id = p_product_id AND mg.active = TRUE
    ORDER BY mg.display_order, mo.display_order;
END //
DELIMITER ;

-- Asignar grupos de modificadores a un producto (reemplaza toda la asignacion)
DELIMITER //
CREATE PROCEDURE sp_assign_product_modifier_groups(
    IN p_product_id INT,
    IN p_group_ids JSON
)
BEGIN
    -- Eliminar asignaciones existentes
    DELETE FROM product_modifier_groups WHERE product_id = p_product_id;

    -- Insertar nuevas asignaciones
    IF p_group_ids IS NOT NULL AND JSON_LENGTH(p_group_ids) > 0 THEN
        INSERT INTO product_modifier_groups (product_id, group_id)
        SELECT p_product_id, j.val
        FROM JSON_TABLE(p_group_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        WHERE EXISTS (SELECT 1 FROM modifier_groups mg WHERE mg.id = j.val AND mg.active = TRUE);
    END IF;
END //
DELIMITER ;

-- Calcular precio final con modificadores
DELIMITER //
CREATE PROCEDURE sp_calculate_item_price(
    IN p_product_id INT,
    IN p_modifier_ids JSON
)
BEGIN
    DECLARE v_base_price DECIMAL(10,2);
    DECLARE v_modifier_total DECIMAL(10,2) DEFAULT 0;

    SELECT price INTO v_base_price FROM products WHERE id = p_product_id;

    IF p_modifier_ids IS NOT NULL AND JSON_LENGTH(p_modifier_ids) > 0 THEN
        SELECT IFNULL(SUM(mo.price_adjustment), 0) INTO v_modifier_total
        FROM modifier_options mo
        WHERE mo.id IN (
            SELECT CAST(j.val AS UNSIGNED)
            FROM JSON_TABLE(p_modifier_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        ) AND mo.active = TRUE;
    END IF;

    SELECT v_base_price AS base_price, v_modifier_total AS modifier_total,
           (v_base_price + v_modifier_total) AS final_price;
END //
DELIMITER ;