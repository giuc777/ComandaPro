USE comandapro;

DROP PROCEDURE IF EXISTS sp_list_catalog_groups;

DELIMITER //
CREATE PROCEDURE sp_list_catalog_groups()
BEGIN
    SELECT cg.id, cg.name, cg.slug, cg.description, cg.icon, cg.color,
           cg.sort_order, cg.active, cg.created_at, cg.updated_at,
           COUNT(ci.id) AS item_count
    FROM catalog_groups cg
    LEFT JOIN catalog_items ci ON ci.group_id = cg.id AND ci.active = TRUE
    WHERE cg.active = TRUE
    GROUP BY cg.id
    ORDER BY cg.sort_order, cg.name;
END //
DELIMITER ;
