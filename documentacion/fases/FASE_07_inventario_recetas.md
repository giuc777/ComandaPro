# Fase 7: Inventario y Recetas

## Objetivo
Implementar el control de inventario con recetas (producto → ingredientes) y **deducción automática obligatoria** al cobrar una orden.

---

## Dependencias

| Fase | Motivo |
|------|--------|
| FASE 02 | Productos (para asociar recetas) |
| FASE 04 | Órdenes y POS (genera `order_items`) |
| FASE 06 | Pagos (dispara la deducción al cobrar) |

> ⚠️ **IMPORTANTE:** Esta fase NO puede completarse sin FASE 04 y FASE 06.
> La deducción de inventario se ejecuta **dentro de la transacción de pago**.
> Sin una orden cobrada no existe el evento que dispare la deducción.

---

## Decisiones de Arquitectura (acordadas)

1. **El stock vive en un solo lugar:** `inventory`.
   El catálogo `ingredientes_principales` es solo una lista de referencia para
   nombrar insumos; **NO almacena stock**. Esto evita problemas de sincronización
   entre dos fuentes de verdad.

2. **Catálogo ↔ Inventario vinculados (Opción B):**
   Cada insumo de inventario se crea seleccionando un item del catálogo
   `ingredientes_principales` mediante `inventory.catalog_item_id`.
   Así se evita duplicar nombres y se mantiene consistencia.

3. **Deducción obligatoria:**
   Al cobrar una orden el sistema deduce el inventario según las recetas.
   Si la deducción falla, el cobro falla (transacción atómica).
   **No existe modo de venta sin deducción.**

---

## Flujo de Deducción

```
POS (FASE 04)                  PAGO (FASE 06)                    INVENTARIO (FASE 07)
─────────────                  ──────────────                    ────────────────────
Agregar producto  ──►  order_items creado
                               │
                               ▼
                        Cobrar orden  ───────────────►  sp_deduct_inventory(order_id)
                                                              │
                                                              ├─ por cada order_item
                                                              │     └─ buscar receta del producto
                                                              │           └─ stock -= cantidad_receta * qty
                                                              │
                                                              ├─ OK  → commit pago
                                                              └─ FAIL → rollback (cobro falla)
```

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 7: Inventario y Recetas
-- ============================================

CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    catalog_item_id INT,                          -- Vinculo al catalogo de ingredientes
    name VARCHAR(100) NOT NULL,                   -- Nombre (sincronizado del catalogo)
    unit VARCHAR(20) NOT NULL,                    -- Unidad (kg, litros, ml, unidades)
    stock DECIMAL(10,3) NOT NULL DEFAULT 0,       -- Stock actual (UNICA fuente de verdad)
    min_stock DECIMAL(10,3) DEFAULT 0,            -- Umbral de stock bajo
    cost_per_unit DECIMAL(10,2) DEFAULT 0,        -- Costo por unidad
    supplier_id INT,                              -- Proveedor (FASE 08)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (catalog_item_id) REFERENCES catalog_items(id) ON DELETE SET NULL,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity_per_unit DECIMAL(10,3) NOT NULL,     -- Cantidad de insumo por unidad vendida
    unit VARCHAR(20) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_inventory (product_id, inventory_id)   -- Un insumo no se repite por producto
);

-- Indices
CREATE INDEX idx_inventory_catalog ON inventory(catalog_item_id);
CREATE INDEX idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX idx_inventory_stock ON inventory(stock, min_stock);
CREATE INDEX idx_recipes_product ON recipes(product_id);
CREATE INDEX idx_recipes_inventory ON recipes(inventory_id);
```

### Regla de integridad
- `inventory.catalog_item_id` siempre debe apuntar a un item del grupo
  `ingredientes_principales`. Se valida en el procedimiento de creación.
- `recipes` tiene `UNIQUE (product_id, inventory_id)` para evitar ingredientes
  duplicados dentro de la misma receta.

---

## 2. Procedimientos Almacenados

```sql
-- Listar inventario (con filtro stock bajo)
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

-- Crear insumo vinculado al catalogo de ingredientes
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
    -- Validar que el item de catalogo pertenece a ingredientes_principales
    DECLARE v_valid INT DEFAULT 0;
    SELECT COUNT(*) INTO v_valid
    FROM catalog_items ci
    JOIN catalog_groups cg ON ci.group_id = cg.id
    WHERE ci.id = p_catalog_item_id AND cg.slug = 'ingredientes_principales';

    IF v_valid = 1 THEN
        INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id)
        VALUES (p_catalog_item_id, p_name, p_unit, p_stock, p_min_stock, p_cost_per_unit, p_supplier_id);
        SELECT LAST_INSERT_ID() AS id;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'catalog_item_id no pertenece a ingredientes_principales';
    END IF;
END //
DELIMITER ;

-- Obtener receta de un producto
DELIMITER //
CREATE PROCEDURE sp_get_product_recipe(IN p_product_id INT)
BEGIN
    SELECT r.id, r.inventory_id, i.name AS ingredient_name,
           i.unit AS ingredient_unit, r.quantity_per_unit, i.stock,
           (r.quantity_per_unit * i.cost_per_unit) AS line_cost
    FROM recipes r
    JOIN inventory i ON r.inventory_id = i.id
    WHERE r.product_id = p_product_id
    ORDER BY i.name;
END //
DELIMITER ;

-- Costo calculado del producto desde su receta
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

-- Deducir inventario al cobrar (OBLIGATORIO)
-- Se llama DENTRO de la transaccion de pago (FASE 06).
-- Si algun producto no tiene receta definida -> SIGNAL y rollback del cobro.
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

-- Actualizar stock manual
DELIMITER //
CREATE PROCEDURE sp_update_stock(IN p_inventory_id INT, IN p_new_stock DECIMAL(10,3))
BEGIN
    UPDATE inventory SET stock = p_new_stock WHERE id = p_inventory_id;
END //
DELIMITER ;

-- Crear / agregar ingrediente a la receta de un producto
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
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/inventory` | Listar inventario (?lowStock=true) | Sí |
| `GET` | `/api/inventory/:id` | Detalle de insumo | Sí |
| `POST` | `/api/inventory` | Crear insumo (vinculado a catálogo) | Admin |
| `PUT` | `/api/inventory/:id` | Actualizar stock/datos | Admin |
| `DELETE` | `/api/inventory/:id` | Desactivar insumo | Admin |
| `GET` | `/api/recipes/product/:id` | Receta de un producto | Sí |
| `POST` | `/api/recipes/product/:id` | Agregar/actualizar ingrediente | Admin |
| `DELETE` | `/api/recipes/:id` | Quitar ingrediente de receta | Admin |
| `GET` | `/api/recipes/product/:id/cost` | Costo calculado desde receta | Sí |

> La deducción (`sp_deduct_inventory`) **no expone endpoint propio**:
> se invoca internamente dentro del cobro (FASE 06). No debe poder llamarse
> manualmente desde el cliente.

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   ├── InventarioPage.jsx      # Tabla de inventario (reemplaza mock actual)
│   └── RecetasPage.jsx         # Recetas por producto + costos
├── components/
│   ├── InventoryTable.jsx      # Tabla con filtros
│   ├── StockBadge.jsx          # Badge de estado stock (ok/critical)
│   ├── RecipeEditor.jsx        # Editor de ingredientes de un producto
│   └── CostCalculator.jsx      # Costo receta vs costo declarado
└── api/
    └── inventory.js
```

### Vinculación en UI
- Al crear un insumo, el campo **Nombre** es un `<select>` poblado desde
  `GET /api/catalogs/groups/ingredientes_principales/items`.
- Al seleccionar el ingrediente, se autocompletan `name` y se guarda
  `catalog_item_id`.
- En `RecetasPage`, cada producto muestra su lista de ingredientes con
  cantidades por unidad.

---

## 5. Pruebas

### Jest:
```javascript
describe('Inventory System', () => {
  test('listar inventario retorna items con status')
  test('filtro lowStock retorna solo stock critico')
  test('crear insumo valida que catalog_item sea de ingredientes_principales')
  test('deducir inventario resta stock segun receta')
  test('producto sin receta hace fallar la deduccion')
  test('costo de receta se calcula sumando ingredientes')
})
```

### Playwright:
```javascript
test('inventario muestra items con stock bajo', async ({ page }) => {
  await page.goto('/inventario')
  await expect(page.locator('.stock-critical')).toBeVisible()
})

test('editar receta agrega ingrediente del catalogo', async ({ page }) => {
  await page.goto('/recetas')
  await page.selectOption('[data-testid=ingredient-select]', 'Leche Entera')
  await page.fill('[data-testid=quantity]', '0.25')
  await page.click('[data-testid=save-recipe]')
})
```

---

## 6. Datos Semilla

Los insumos se crean **vinculados al catálogo** `ingredientes_principales`
(ids 20-25 del catálogo actual). Se amplía el catálogo si faltan ingredientes.

```sql
-- Insumos vinculados al catalogo de ingredientes
INSERT INTO inventory (catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id) VALUES
((SELECT id FROM catalog_items WHERE name='Cafe Arabica'),    'Cafe en Granos', 'kg',     50, 10, 42.00, NULL),
((SELECT id FROM catalog_items WHERE name='Leche Entera'),    'Leche Entera',   'litros', 100, 20,  8.00, NULL),
((SELECT id FROM catalog_items WHERE name='Leche de Avena'),  'Leche de Avena', 'litros',  50, 10, 12.00, NULL),
((SELECT id FROM catalog_items WHERE name='Vainilla'),        'Vainilla',       'ml',     500, 100 ,0.50, NULL),
((SELECT id FROM catalog_items WHERE name='Chocolate'),       'Chocolate',      'kg',       5,  1, 35.00, NULL),
((SELECT id FROM catalog_items WHERE name='Matcha'),          'Matcha',         'kg',       2,0.5, 85.00, NULL);

-- Recetas de ejemplo (Latte Vainilla = product_id 1)
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 0.018, 'kg'    FROM inventory WHERE name='Cafe en Granos'
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 0.25, 'litros' FROM inventory WHERE name='Leche Entera'
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);

INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit)
SELECT 1, id, 15, 'ml'       FROM inventory WHERE name='Vainilla'
ON DUPLICATE KEY UPDATE quantity_per_unit=VALUES(quantity_per_unit);
```

> **Nota:** Para que la deducción obligatoria funcione, **todos** los productos
> activos que se vendan en el POS deben tener al menos una receta. Los productos
> sin receta bloquearán el cobro (por diseño). Evaluar productos de reventa
> directa (ej. agua embotellada) y crearles un insumo de inventario 1:1.

---

## 7. Criterios de Aceptación

- [ ] Inventario muestra todos los insumos con stock actual
- [ ] Insumos con stock ≤ min_stock muestran badge "crítico"
- [ ] Crear insumo requiere seleccionar un ingrediente del catálogo `ingredientes_principales`
- [ ] Recetas muestran ingredientes y cantidades por unidad
- [ ] Costo de producto se calcula desde receta y se compara con `products.cost`
- [ ] Al cobrar una orden, el inventario se deduce automáticamente según recetas
- [ ] Si un producto vendido no tiene receta, el cobro falla y hace rollback
- [ ] La deducción se ejecuta dentro de la transacción de pago (atómica)
- [ ] Admin puede actualizar stock manualmente (conteo físico / mermas)

---

## 8. Orden de Implementación Sugerido

1. Migración SQL (`inventory` + `recipes` con nuevas columnas/constraints)
2. Procedimientos almacenados (listar, crear, recetas, costo, deducir)
3. Backend: `inventoryController.js` + `recipeController.js` + routes
4. Frontend: `InventarioPage.jsx` + `RecetasPage.jsx` + `RecipeEditor`
5. Integración en el cobro (FASE 06): invocar `sp_deduct_inventory` en la
   misma transacción del pago
6. Pruebas unitarias (Jest) de deducción y validaciones
7. Pruebas E2E (Playwright)

> **Bloqueante:** los pasos 5 requieren FASE 04 (Órdenes) y FASE 06 (Pagos)
> implementadas. Los pasos 1-4 y 6-7 se pueden desarrollar antes.