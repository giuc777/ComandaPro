-- ============================================
-- FASE 9: Procedimientos de Mesas (Catalogo sync)
-- ============================================
USE comandapro;

-- ============================================
-- ACTUALIZAR SPs de catalog_items para capacity/table_id
-- ============================================

-- Listar items de un grupo por slug (con capacity y table_id)
DROP PROCEDURE IF EXISTS sp_list_catalog_items_by_group;
DELIMITER //
CREATE PROCEDURE sp_list_catalog_items_by_group(IN p_slug VARCHAR(50))
BEGIN
    SELECT ci.id, ci.group_id, ci.name, ci.description, ci.icon, ci.color,
           ci.parent_id, ci.sort_order, ci.price_adjustment,
           ci.capacity, ci.table_id,
           ci.active, ci.created_at, ci.updated_at,
           ci2.name AS parent_name,
           t.status AS table_status, t.current_order_id
    FROM catalog_items ci
    INNER JOIN catalog_groups cg ON ci.group_id = cg.id
    LEFT JOIN catalog_items ci2 ON ci.parent_id = ci2.id
    LEFT JOIN tables t ON ci.table_id = t.id
    WHERE cg.slug = p_slug AND ci.active = TRUE AND cg.active = TRUE
    ORDER BY ci.sort_order, ci.name;
END //
DELIMITER ;

-- Obtener item por ID (con capacity y table_id)
DROP PROCEDURE IF EXISTS sp_get_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_get_catalog_item(IN p_id INT)
BEGIN
    SELECT id, group_id, name, description, icon, color, parent_id,
           sort_order, price_adjustment, capacity, table_id,
           active, created_at, updated_at
    FROM catalog_items WHERE id = p_id;
END //
DELIMITER ;

-- Crear item (con capacity y table_id)
DROP PROCEDURE IF EXISTS sp_create_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_create_catalog_item(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_price_adjustment DECIMAL(10,2),
    IN p_capacity INT, IN p_table_id INT
)
BEGIN
    INSERT INTO catalog_items (group_id, name, description, icon, color, parent_id, sort_order, price_adjustment, capacity, table_id)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_parent_id, p_sort_order, p_price_adjustment, p_capacity, p_table_id);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar item (con capacity y table_id)
DROP PROCEDURE IF EXISTS sp_update_catalog_item;
DELIMITER //
CREATE PROCEDURE sp_update_catalog_item(
    IN p_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_parent_id INT, IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_price_adjustment DECIMAL(10,2),
    IN p_capacity INT, IN p_table_id INT
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
        price_adjustment = COALESCE(p_price_adjustment, price_adjustment),
        capacity = COALESCE(p_capacity, capacity),
        table_id = p_table_id
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- ============================================
-- SPs de sync para grupo Mesas
-- ============================================

-- Crear mesa: inserta en catalog_items Y crea fila en tables
DROP PROCEDURE IF EXISTS sp_create_mesa_with_table;
DELIMITER //
CREATE PROCEDURE sp_create_mesa_with_table(
    IN p_group_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT, IN p_capacity INT
)
BEGIN
    DECLARE v_table_id INT;
    DECLARE v_item_id INT;

    -- Crear en tables
    INSERT INTO tables (name, capacity) VALUES (p_name, p_capacity);
    SET v_table_id = LAST_INSERT_ID();

    -- Crear en catalog_items
    INSERT INTO catalog_items (group_id, name, description, icon, color, sort_order, capacity, table_id)
    VALUES (p_group_id, p_name, p_description, p_icon, p_color, p_sort_order, p_capacity, v_table_id);
    SET v_item_id = LAST_INSERT_ID();

    SELECT v_item_id AS item_id, v_table_id AS table_id;
END //
DELIMITER ;

-- Actualizar mesa: actualiza catalog_items Y tables
DROP PROCEDURE IF EXISTS sp_update_mesa_with_table;
DELIMITER //
CREATE PROCEDURE sp_update_mesa_with_table(
    IN p_item_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT, IN p_active BOOLEAN,
    IN p_capacity INT
)
BEGIN
    DECLARE v_table_id INT;

    SELECT table_id INTO v_table_id FROM catalog_items WHERE id = p_item_id;

    -- Actualizar catalog_items
    UPDATE catalog_items
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active,
        capacity = COALESCE(p_capacity, capacity)
    WHERE id = p_item_id;

    -- Sincronizar a tables si tiene table_id
    IF v_table_id IS NOT NULL THEN
        UPDATE tables
        SET name = COALESCE(p_name, name),
            capacity = COALESCE(p_capacity, capacity)
        WHERE id = v_table_id;
    END IF;

    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Eliminar mesa: soft delete en catalog_items, hard delete en tables (si libre)
DROP PROCEDURE IF EXISTS sp_delete_mesa_with_table;
DELIMITER //
CREATE PROCEDURE sp_delete_mesa_with_table(IN p_item_id INT)
BEGIN
    DECLARE v_table_id INT;
    DECLARE v_status VARCHAR(20);

    SELECT table_id INTO v_table_id FROM catalog_items WHERE id = p_item_id;

    -- Soft delete en catalog_items
    UPDATE catalog_items SET active = FALSE WHERE id = p_item_id;

    -- Eliminar de tables solo si esta libre
    IF v_table_id IS NOT NULL THEN
        SELECT status INTO v_status FROM tables WHERE id = v_table_id;
        IF v_status = 'free' THEN
            DELETE FROM tables WHERE id = v_table_id;
        END IF;
    END IF;

    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;
