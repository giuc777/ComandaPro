-- PROCEDIMIENTOS ALMACENADOS - FASE 2 - Catalogos
USE comandapro;

-- Listar grupos activos con conteo de items
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_list_catalog_groups()
BEGIN
    SELECT cg.id, cg.name, cg.slug, cg.description, cg.sort_order,
           cg.active, cg.created_at, cg.updated_at,
           COUNT(ci.id) AS item_count
    FROM catalog_groups cg
    LEFT JOIN catalog_items ci ON ci.group_id = cg.id AND ci.active = TRUE
    WHERE cg.active = TRUE
    GROUP BY cg.id
    ORDER BY cg.sort_order, cg.name;
END //
DELIMITER ;

-- Obtener grupo por ID
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_catalog_group(IN p_id INT)
BEGIN
    SELECT id, name, slug, description, sort_order, active, created_at, updated_at
    FROM catalog_groups WHERE id = p_id;
END //
DELIMITER ;

-- Crear grupo
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_catalog_group(
    IN p_name VARCHAR(100), IN p_slug VARCHAR(50),
    IN p_description TEXT, IN p_sort_order INT
)
BEGIN
    INSERT INTO catalog_groups (name, slug, description, sort_order)
    VALUES (p_name, p_slug, p_description, p_sort_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar grupo
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_update_catalog_group(
    IN p_id INT, IN p_name VARCHAR(100),
    IN p_description TEXT, IN p_sort_order INT, IN p_active BOOLEAN
)
BEGIN
    UPDATE catalog_groups
    SET name = COALESCE(p_name, name),
        description = p_description,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar grupo (soft delete)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_delete_catalog_group(IN p_id INT)
BEGIN
    UPDATE catalog_groups SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Listar items de un grupo por slug
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_list_catalog_items_by_group(IN p_slug VARCHAR(50))
BEGIN
    SELECT ci.id, ci.group_id, ci.name, ci.description, ci.icon, ci.color,
           ci.parent_id, ci.sort_order, ci.active, ci.created_at, ci.updated_at,
           ci2.name AS parent_name
    FROM catalog_items ci
    INNER JOIN catalog_groups cg ON ci.group_id = cg.id
    LEFT JOIN catalog_items ci2 ON ci.parent_id = ci2.id
    WHERE cg.slug = p_slug AND ci.active = TRUE AND cg.active = TRUE
    ORDER BY ci.sort_order, ci.name;
END //
DELIMITER ;

-- Obtener item por ID
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_catalog_item(IN p_id INT)
BEGIN
    SELECT id, group_id, name, description, icon, color, parent_id,
           sort_order, active, created_at, updated_at
    FROM catalog_items WHERE id = p_id;
END //
DELIMITER ;

-- Crear item
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_catalog_item(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT
)
BEGIN
    INSERT INTO catalog_items (group_id, name, description, icon, color, parent_id, sort_order)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_parent_id, p_sort_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar item
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_update_catalog_item(
    IN p_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_active BOOLEAN
)
BEGIN
    UPDATE catalog_items
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        parent_id = p_parent_id,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar item (soft delete)
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_delete_catalog_item(IN p_id INT)
BEGIN
    UPDATE catalog_items SET active = FALSE WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Verificar slug unico
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_check_catalog_slug_unique(
    IN p_slug VARCHAR(50), IN p_exclude_id INT
)
BEGIN
    SELECT COUNT(*) AS cnt FROM catalog_groups
    WHERE slug = p_slug AND (p_exclude_id IS NULL OR id != p_exclude_id);
END //
DELIMITER ;
