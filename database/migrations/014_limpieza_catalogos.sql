-- ============================================
-- Limpieza de Catalogos: retirar grupos duplicados
-- ============================================
-- menu_cafe    -> duplica la tabla products
-- proveedores  -> duplica la tabla suppliers (FASE 8)
--
-- Se usa soft-delete (active = FALSE) para que sea reversible
-- y no rompa referencias. Los SPs de catalogo ya filtran active = TRUE.
USE comandapro;

-- Soft-delete de los grupos duplicados
UPDATE catalog_groups SET active = FALSE
WHERE slug IN ('menu_cafe', 'proveedores');

-- Soft-delete de los items de esos grupos
UPDATE catalog_items ci
JOIN catalog_groups cg ON ci.group_id = cg.id
SET ci.active = FALSE
WHERE cg.slug IN ('menu_cafe', 'proveedores');
