USE comandapro;

DROP PROCEDURE IF EXISTS sp_create_catalog_group;
DROP PROCEDURE IF EXISTS sp_update_catalog_group;

DELIMITER //
CREATE PROCEDURE sp_create_catalog_group(
    IN p_name VARCHAR(100), IN p_slug VARCHAR(50),
    IN p_description TEXT, IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT
)
BEGIN
    INSERT INTO catalog_groups (name, slug, description, icon, color, sort_order)
    VALUES (p_name, p_slug, p_description, p_icon, p_color, p_sort_order);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

DELIMITER //
CREATE PROCEDURE sp_update_catalog_group(
    IN p_id INT, IN p_name VARCHAR(100), IN p_description TEXT,
    IN p_icon VARCHAR(50), IN p_color VARCHAR(7),
    IN p_sort_order INT, IN p_active BOOLEAN
)
BEGIN
    UPDATE catalog_groups
    SET name = COALESCE(p_name, name),
        description = p_description,
        icon = p_icon,
        color = p_color,
        sort_order = COALESCE(p_sort_order, sort_order),
        active = p_active
    WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;
