-- ============================================
-- FASE 5: Procedimientos actualizados - Catalogos + Modificadores unificados
-- ============================================
USE comandapro;

-- ============================================
-- ELIMINAR SPs de modificadores (ya no existen las tablas)
-- ============================================
DROP PROCEDURE IF EXISTS sp_list_modifier_groups;
DROP PROCEDURE IF EXISTS sp_get_modifier_group;
DROP PROCEDURE IF EXISTS sp_create_modifier_group;
DROP PROCEDURE IF EXISTS sp_update_modifier_group;
DROP PROCEDURE IF EXISTS sp_delete_modifier_group;
DROP PROCEDURE IF EXISTS sp_list_modifier_options;
DROP PROCEDURE IF EXISTS sp_create_modifier_option;
DROP PROCEDURE IF EXISTS sp_update_modifier_option;
DROP PROCEDURE IF EXISTS sp_delete_modifier_option;
DROP PROCEDURE IF EXISTS sp_assign_product_modifier_groups;
DROP PROCEDURE IF EXISTS sp_calculate_item_price;

-- ============================================
-- CATALOGOS ACTUALIZADOS (con campos de modificador)
-- ============================================

-- Listar grupos activos con conteo de items (actualizado)
DROP PROCEDURE IF EXISTS sp_list_catalog_groups;
DELIMITER //
CREATE PROCEDURE sp_list_catalog_groups()
BEGIN
    SELECT cg.id, cg.name, cg.slug, cg.description, cg.sort_order,
           cg.active, cg.is_modifier, cg.required, cg.max_selections,
           cg.created_at, cg.updated_at,
           COUNT(ci.id) AS item_count
    FROM catalog_groups cg
    LEFT JOIN catalog_items ci ON ci.group_id = cg.id AND ci.active = TRUE
    WHERE cg.active = TRUE
    GROUP BY cg.id
    ORDER BY cg.sort_order, cg.name;
END //
DELIMITER ;

-- Obtener grupo por ID (actualizado)
DROP PROCEDURE IF EXISTS sp_get_catalog_group;
DELIMITER //
CREATE PROCEDURE sp_get_catalog_group(IN p_id INT)
BEGIN
    SELECT id, name, slug, description, sort_order, active,
           is_modifier, required, max_selections,
           created_at, updated_at
    FROM catalog_groups WHERE id = p_id;
END //
DELIMITER ;

-- Crear grupo (actualizado)
DROP PROCEDURE IF EXISTS sp_create_catalog_group;
DELIMITER //
CREATE PROCEDURE sp_create_catalog_group(
    IN p_name VARCHAR(100), IN p_slug VARCHAR(50),
    IN p_description TEXT, IN p_sort_order INT,
    IN p_is_modifier BOOLEAN, IN p_required BOOLEAN, IN p_max_selections INT
)
BEGIN
    INSERT INTO catalog_groups (name, slug, description, sort_order, is_modifier, required, max_selections)
    VALUES (p_name, p_slug, p_description, p_sort_order, p_is_modifier, p_required, p_max_selections);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar grupo (actualizado)
DROP PROCEDURE IF EXISTS sp_update_catalog_group;
DELIMITER //
CREATE PROCEDURE sp_update_catalog_group(
    IN p_id INT, IN p_name VARCHAR(100),
    IN p_description TEXT, IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_is_modifier BOOLEAN, IN p_required BOOLEAN, IN p_max_selections INT
)
BEGIN
    UPDATE catalog_groups
    SET name = COALESCE(p_name, name),
        description = p_description,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        is_modifier = p_is_modifier,
        required = p_required,
        max_selections = p_max_selections
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar grupo (soft delete) - igual que antes
DROP PROCEDURE IF EXISTS sp_delete_catalog_group;
DELIMITER //
CREATE PROCEDURE sp_delete_catalog_group(IN p_id INT)
BEGIN
    UPDATE catalog_groups SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Listar items de un grupo por slug (actualizado con price_adjustment)
DROP PROCEDURE IF EXISTS sp_list_catalog_items_by_group;
DELIMITER //
CREATE PROCEDURE sp_list_catalog_items_by_group(IN p_slug VARCHAR(50))
BEGIN
    SELECT ci.id, ci.group_id, ci.name, ci.description, ci.icon, ci.color,
           ci.parent_id, ci.sort_order, ci.price_adjustment, ci.active,
           ci.created_at, ci.updated_at,
           ci2.name AS parent_name
    FROM catalog_items ci
    INNER JOIN catalog_groups cg ON ci.group_id = cg.id
    LEFT JOIN catalog_items ci2 ON ci.parent_id = ci2.id
    WHERE cg.slug = p_slug AND ci.active = TRUE AND cg.active = TRUE
    ORDER BY ci.sort_order, ci.name;
END //
DELIMITER ;

-- Obtener item por ID (actualizado)
DROP PROCEDURE IF EXISTS sp_get_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_get_catalog_item(IN p_id INT)
BEGIN
    SELECT id, group_id, name, description, icon, color, parent_id,
           sort_order, price_adjustment, active, created_at, updated_at
    FROM catalog_items WHERE id = p_id;
END //
DELIMITER ;

-- Crear item (actualizado)
DROP PROCEDURE IF EXISTS sp_create_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_create_catalog_item(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_price_adjustment DECIMAL(10,2)
)
BEGIN
    INSERT INTO catalog_items (group_id, name, description, icon, color, parent_id, sort_order, price_adjustment)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_parent_id, p_sort_order, p_price_adjustment);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar item (actualizado)
DROP PROCEDURE IF EXISTS sp_update_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_update_catalog_item(
    IN p_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_price_adjustment DECIMAL(10,2)
)
BEGIN
    UPDATE catalog_items
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        parent_id = p_parent_id,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        price_adjustment = COALESCE(p_price_adjustment, price_adjustment)
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar item (soft delete) - igual que antes
DROP PROCEDURE IF EXISTS sp_delete_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_delete_catalog_item(IN p_id INT)
BEGIN
    UPDATE catalog_items SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Verificar slug unico - igual que antes
DROP PROCEDURE IF EXISTS sp_check_catalog_slug_unique;
DELIMITER //
CREATE PROCEDURE sp_check_catalog_slug_unique(
    IN p_slug VARCHAR(50), IN p_exclude_id INT
)
BEGIN
    SELECT COUNT(*) AS cnt FROM catalog_groups
    WHERE slug = p_slug AND (p_exclude_id IS NULL OR id != p_exclude_id);
END //
DELIMITER ;

-- ============================================
-- MODIFICADORES (basados en catalogos)
-- ============================================

-- Obtener modificadores de un producto (desde catalogos)
DROP PROCEDURE IF EXISTS sp_get_product_modifiers;
DELIMITER //
CREATE PROCEDURE sp_get_product_modifiers(IN p_product_id INT)
BEGIN
    SELECT cg.id AS group_id, cg.name AS group_name, cg.required, cg.max_selections,
           ci.id AS option_id, ci.name AS option_name, ci.price_adjustment
    FROM product_modifier_groups pmg
    JOIN catalog_groups cg ON pmg.group_id = cg.id
    LEFT JOIN catalog_items ci ON cg.id = ci.group_id AND ci.active = TRUE
    WHERE pmg.product_id = p_product_id AND cg.active = TRUE AND cg.is_modifier = TRUE
    ORDER BY cg.sort_order, ci.sort_order;
END //
DELIMITER ;

-- Asignar grupos de modificadores a un producto (reemplaza toda la asignacion)
DROP PROCEDURE IF EXISTS sp_assign_product_modifier_groups;
DELIMITER //
CREATE PROCEDURE sp_assign_product_modifier_groups(
    IN p_product_id INT,
    IN p_group_ids JSON
)
BEGIN
    DELETE FROM product_modifier_groups WHERE product_id = p_product_id;

    IF p_group_ids IS NOT NULL AND JSON_LENGTH(p_group_ids) > 0 THEN
        INSERT INTO product_modifier_groups (product_id, group_id)
        SELECT p_product_id, j.val
        FROM JSON_TABLE(p_group_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        WHERE EXISTS (
            SELECT 1 FROM catalog_groups cg
            WHERE cg.id = j.val AND cg.active = TRUE AND cg.is_modifier = TRUE
        );
    END IF;
END //
DELIMITER ;

-- Calcular precio final con modificadores (desde catalogos)
DROP PROCEDURE IF EXISTS sp_calculate_item_price;
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
        SELECT IFNULL(SUM(ci.price_adjustment), 0) INTO v_modifier_total
        FROM catalog_items ci
        WHERE ci.id IN (
            SELECT CAST(j.val AS UNSIGNED)
            FROM JSON_TABLE(p_modifier_ids, '$[*]' COLUMNS (val INT PATH '$')) j
        ) AND ci.active = TRUE;
    END IF;

    SELECT v_base_price AS base_price, v_modifier_total AS modifier_total,
           (v_base_price + v_modifier_total) AS final_price;
END //
DELIMITER ;