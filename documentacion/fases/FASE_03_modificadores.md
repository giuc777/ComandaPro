# Fase 3: Sistema de Modificadores

> **Estado:** Los modificadores se gestionan dentro de la Fase 2B (Catálogos).
> Este documento describe cómo funciona el modelo unificado.

## Objetivo
Permitir personalizar productos con ajustes de precio (leche, tamaño, temperatura, extras) usando el sistema de catálogos unificado.

---

## 1. Modelo de Datos

Los modificadores **no son tablas separadas**. Viven en las tablas de catálogos:

```sql
-- catalog_groups tiene flags de modificador
ALTER TABLE catalog_groups ADD COLUMN is_modifier BOOLEAN DEFAULT FALSE;
ALTER TABLE catalog_groups ADD COLUMN required BOOLEAN DEFAULT FALSE;
ALTER TABLE catalog_groups ADD COLUMN max_selections INT DEFAULT 1;

-- catalog_items tiene ajuste de precio
ALTER TABLE catalog_items ADD COLUMN price_adjustment DECIMAL(10,2) DEFAULT 0;

-- product_modifier_groups referencia catalog_groups (no modifier_groups)
CREATE TABLE product_modifier_groups (
    product_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (product_id, group_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES catalog_groups(id) ON DELETE CASCADE
);
```

---

## 2. Procedimientos Almacenados

```sql
-- Obtener modificadores de un producto (lee de catalog_*)
DELIMITER //
CREATE PROCEDURE sp_get_product_modifiers(IN p_product_id INT)
BEGIN
    SELECT cg.id AS group_id, cg.name AS group_name, cg.max_selections,
           ci.id AS option_id, ci.name AS option_name, ci.price_adjustment
    FROM product_modifier_groups pmg
    JOIN catalog_groups cg ON pmg.group_id = cg.id
    LEFT JOIN catalog_items ci ON cg.id = ci.group_id AND ci.active = TRUE
    WHERE pmg.product_id = p_product_id AND cg.is_modifier = TRUE
      AND cg.active = TRUE
    ORDER BY cg.sort_order, ci.sort_order;
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
        SELECT IFNULL(SUM(ci.price_adjustment), 0) INTO v_modifier_total
        FROM catalog_items ci
        WHERE ci.id IN (SELECT CAST(j.val AS UNSIGNED)
                        FROM JSON_TABLE(p_modifier_ids, '$[*]'
                        COLUMNS (val INT PATH '$')) j)
        AND ci.active = TRUE;
    END IF;

    SELECT v_base_price AS base_price, v_modifier_total AS modifier_total,
           (v_base_price + v_modifier_total) AS final_price;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/products/:id/modifiers` | Modificadores de un producto | Sí |
| `PUT` | `/api/products/:id/modifiers` | Asignar grupos a producto | Admin |

> La CRUD de grupos e items de modificadores se gestiona vía `/api/catalogs/groups` y `/api/catalogs/groups/:slug/items` (misma API que catálogos), con el flag `is_modifier`.

---

## 4. Componentes React

```
front-end/src/
├── components/
│   ├── ModifierModal.jsx      # Modal de selección de modificadores (POS)
│   ├── ModifierGroup.jsx      # Grupo de modificadores (chips)
│   └── ModifierChip.jsx       # Chip individual de modificador
└── pages/
    ├── CatalogosPage.jsx       # Badge "Modificador" + toggle en modal
    └── CatalogoDetallePage.jsx # price_adjustment + "Asignar productos"
```

### Flujo del ModifierModal:
1. Usuario clickea producto en POS
2. Si tiene modifierGroups → abre ModifierModal
3. Modal muestra cada grupo como sección
4. Chips de opciones con precio (+Q4, -Q4, Q0)
5. Selección única (leche, tamaño, temp) o múltiple (extras, max N)
6. Total actualiza en tiempo real
7. Confirmar → addToOrder(productId, modifierIds)

---

## 5. Seed Data (en Fase 2B)

Los grupos de modificadores se insertan como catálogos con `is_modifier = TRUE`:

| Grupo | is_modifier | required | max_selections |
|-------|-------------|----------|----------------|
| Tipo de Leche | TRUE | FALSE | 1 |
| Temperatura | TRUE | FALSE | 1 |
| Extras | TRUE | FALSE | 3 |

Los items se insertan en `catalog_items` con `price_adjustment`.

---

## 6. Criterios de Aceptación

- [x] Grupos de modificadores se crean/editan desde Catálogos
- [x] Badge "Modificador" visible en cards de grupo
- [x] Toggle "Grupo de modificadores" en modal de crear/editar
- [x] Campo `price_adjustment` visible en items de grupo modificador
- [x] "Asignar productos" vincula grupo modificador a productos
- [x] Productos sin modificadores se agregan directamente al ticket
- [x] Modificadores se guardan como IDs en order_items
