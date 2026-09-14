# Fase 7: Inventario y Recetas

## Objetivo
Implementar el control de inventario con recetas (producto → ingredientes) y deducción automática al cobrar.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 7: Inventario y Recetas
-- ============================================

CREATE TABLE inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    stock DECIMAL(10,3) NOT NULL DEFAULT 0,
    min_stock DECIMAL(10,3) DEFAULT 0,
    cost_per_unit DECIMAL(10,2) DEFAULT 0,
    supplier_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

CREATE TABLE recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity_per_unit DECIMAL(10,3) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE CASCADE,
    UNIQUE KEY uk_product_inventory (product_id, inventory_id)
);

-- Índices
CREATE INDEX idx_inventory_supplier ON inventory(supplier_id);
CREATE INDEX idx_inventory_stock ON inventory(stock, min_stock);
CREATE INDEX idx_recipes_product ON recipes(product_id);
```

---

## 2. Procedimientos Almacenados

```sql
-- Listar inventario (con filtro stock bajo)
DELIMITER //
CREATE PROCEDURE sp_list_inventory(IN p_low_stock_only BOOLEAN)
BEGIN
    IF p_low_stock_only = TRUE THEN
        SELECT i.id, i.name, i.unit, i.stock, i.min_stock, i.cost_per_unit,
               s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.stock <= i.min_stock
        ORDER BY i.name;
    ELSE
        SELECT i.id, i.name, i.unit, i.stock, i.min_stock, i.cost_per_unit,
               s.name AS supplier_name,
               CASE WHEN i.stock <= i.min_stock THEN 'critical' ELSE 'ok' END AS status
        FROM inventory i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        ORDER BY i.name;
    END IF;
END //
DELIMITER ;

-- Obtener receta de un producto
DELIMITER //
CREATE PROCEDURE sp_get_product_recipe(IN p_product_id INT)
BEGIN
    SELECT r.id, r.inventory_id, i.name AS ingredient_name,
           i.unit AS ingredient_unit, r.quantity_per_unit, i.stock
    FROM recipes r
    JOIN inventory i ON r.inventory_id = i.id
    WHERE r.product_id = p_product_id;
END //
DELIMITER ;

-- Deducir inventario al cobrar
DELIMITER //
CREATE PROCEDURE sp_deduct_inventory(IN p_order_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_product_id INT;
    DECLARE v_quantity INT;
    DECLARE v_inv_id INT;
    DECLARE v_deduct_qty DECIMAL(10,3);

    -- Cursor: ítems de la orden
    DECLARE cur CURSOR FOR
        SELECT product_id, quantity FROM order_items WHERE order_id = p_order_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO v_product_id, v_quantity;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        -- Deducir cada ingrediente de la receta
        BEGIN
            DECLARE r_done INT DEFAULT FALSE;
            DECLARE r_cursor CURSOR FOR
                SELECT inventory_id, quantity_per_unit FROM recipes WHERE product_id = v_product_id;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET r_done = TRUE;

            OPEN r_cursor;
            recipe_loop: LOOP
                FETCH r_cursor INTO v_inv_id, v_deduct_qty;
                IF r_done THEN
                    LEAVE recipe_loop;
                END IF;

                UPDATE inventory
                SET stock = stock - (v_deduct_qty * v_quantity)
                WHERE id = v_inv_id;

            END LOOP recipe_loop;
            CLOSE r_cursor;
        END;

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
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/inventory` | Listar inventario (?lowStock=true) | Sí |
| `GET` | `/api/inventory/:id` | Detalle de insumo | Sí |
| `PUT` | `/api/inventory/:id` | Actualizar stock | Admin |
| `GET` | `/api/recipes` | Listar recetas | Sí |
| `GET` | `/api/recipes/product/:id` | Receta de un producto | Sí |
| `POST` | `/api/recipes` | Crear receta | Admin |
| `PUT` | `/api/recipes/:id` | Actualizar receta | Admin |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   ├── InventoryPage.jsx       # Tabla de inventario
│   └── RecipesPage.jsx         # Recetas y costos
├── components/
│   ├── InventoryTable.jsx      # Tabla con filtros
│   ├── StockBadge.jsx          # Badge de estado stock
│   ├── RecipeCard.jsx          # Card de receta
│   └── CostCalculator.jsx      # Calculadora de costos
└── api/
    └── inventory.js
```

---

## 5. Pruebas

### Jest:
```javascript
describe('Inventory System', () => {
  test('deducir inventario resta stock correctamente')
  test('producto sin receta no deduce inventario')
  test('stock bajo retorna status critical')
  test('calcular costo de producto suma ingredientes')
})
```

### Playwright:
```javascript
test('inventario muestra items con stock bajo', async ({ page }) => {
  await page.goto('/#/inventario')
  await expect(page.locator('.stock-critical')).toBeVisible()
})
```

---

## 6. Datos Semilla

```sql
INSERT INTO inventory (name, unit, stock, min_stock, cost_per_unit, supplier_id) VALUES
('Café en Granos', 'kg', 50, 10, 42.00, 1),
('Leche Entera', 'litros', 100, 20, 8.00, 2),
('Leche de Avena', 'litros', 50, 10, 12.00, 2),
('Vainilla', 'ml', 500, 100, 0.50, 3),
('Chocolate en Polvo', 'kg', 5, 1, 35.00, 3),
('Matcha', 'kg', 2, 0.5, 85.00, 3),
('Almendra Fileteada', 'kg', 3, 0.5, 55.00, 3),
('Hojaldre', 'unidades', 50, 10, 3.50, 3),
('Pan Baguette', 'unidades', 30, 5, 2.00, 3),
('Filtros V60', 'unidades', 200, 50, 0.75, 3),
('Maracuyá Pulp', 'litros', 10, 2, 15.00, 3),
('Menta Fresca', 'manojos', 2, 0.5, 5.00, 3);

-- Recetas del prototipo
INSERT INTO recipes (product_id, inventory_id, quantity_per_unit, unit) VALUES
(1, 1, 0.018, 'kg'),    -- Latte Vainilla: Café
(1, 2, 0.25, 'litros'), -- Latte Vainilla: Leche
(1, 4, 15, 'ml'),       -- Latte Vainilla: Vainilla
-- ... (resto de recetas)
```

---

## 7. Criterios de Aceptación

- [ ] Inventario muestra todos los items con stock actual
- [ ] Items con stock ≤ min_stock muestran badge "crítico"
- [ ] Recetas muestran ingredientes y cantidades
- [ ] Costo de producto se calcula desde receta
- [ ] Al cobrar, inventario se deduce automáticamente
- [ ] Admin puede actualizar stock manualmente
