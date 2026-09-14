# Fase 3: Sistema de Modificadores

## Objetivo
Implementar el sistema de modificadores (leche, tamaño, temperatura, extras) que permite personalizar productos con ajustes de precio.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 3: Modificadores
-- ============================================

CREATE TABLE modifier_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    max_selections INT DEFAULT 1,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE modifier_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

CREATE TABLE product_modifier_groups (
    product_id INT NOT NULL,
    group_id INT NOT NULL,
    PRIMARY KEY (product_id, group_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES modifier_groups(id) ON DELETE CASCADE
);

-- Índices
CREATE INDEX idx_modifier_options_group ON modifier_options(group_id);
CREATE INDEX idx_product_modifiers_product ON product_modifier_groups(product_id);
```

---

## 2. Procedimientos Almacenados

```sql
-- Listar todos los grupos con sus opciones
DELIMITER //
CREATE PROCEDURE sp_list_modifier_groups()
BEGIN
    SELECT mg.id, mg.name, mg.required, mg.max_selections,
           mo.id AS option_id, mo.name AS option_name, mo.price_adjustment
    FROM modifier_groups mg
    LEFT JOIN modifier_options mo ON mg.id = mo.group_id AND mo.active = TRUE
    WHERE mg.active = TRUE
    ORDER BY mg.display_order, mo.display_order;
END //
DELIMITER ;

-- Obtener modificadores de un producto
DELIMITER //
CREATE PROCEDURE sp_get_product_modifiers(IN p_product_id INT)
BEGIN
    SELECT mg.id AS group_id, mg.name AS group_name, mg.max_selections,
           mo.id AS option_id, mo.name AS option_name, mo.price_adjustment
    FROM product_modifier_groups pmg
    JOIN modifier_groups mg ON pmg.group_id = mg.id
    LEFT JOIN modifier_options mo ON mg.id = mo.group_id AND mo.active = TRUE
    WHERE pmg.product_id = p_product_id AND mg.active = TRUE
    ORDER BY mg.display_order, mo.display_order;
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
        WHERE mo.id IN (SELECT CAST(j.val AS UNSIGNED) FROM JSON_TABLE(p_modifier_ids, '$[*]' COLUMNS (val INT PATH '$')) j)
        AND mo.active = TRUE;
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
| `GET` | `/api/modifiers` | Todos los grupos con opciones | Sí |
| `GET` | `/api/products/:id/modifiers` | Modificadores de un producto | Sí |
| `POST` | `/api/modifiers/groups` | Crear grupo | Admin |
| `POST` | `/api/modifiers/options` | Crear opción | Admin |
| `PUT` | `/api/modifiers/groups/:id` | Actualizar grupo | Admin |
| `PUT` | `/api/modifiers/options/:id` | Actualizar opción | Admin |
| `POST` | `/api/products/:id/modifiers` | Asignar grupos a producto | Admin |

---

## 4. Componentes React

```
front-end/src/
├── components/
│   ├── ModifierModal.jsx      # Modal de selección de modificadores
│   ├── ModifierGroup.jsx      # Grupo de modificadores (chips)
│   └── ModifierChip.jsx       # Chip individual de modificador
└── api/
    └── modifiers.js
```

### Flujo del ModifierModal:
1. Usuario clickea producto en POS
2. Si tiene modifierGroups → abre ModifierModal
3. Modal muestra cada grupo como sección
4. Chips de opciones con precio (+Q4, -Q4, Q0)
5. Selección única (milk, size, temp) o múltiple (extras, max 3)
6. Total actualiza en tiempo real
7. Confirmar → addToOrder(productId, modifierIds)

---

## 5. Pruebas

### Jest:
```javascript
describe('Modifier System', () => {
  test('obtener modificadores de producto retorna grupos correctos')
  test('calcular precio con modificadores suma correctamente')
  test('latte vainilla + avena + grande = Q36 (28+4+4)')
  test('extras limitado a 3 selecciones')
})
```

### Playwright:
```javascript
test('abrir modal de modificadores al seleccionar producto', async ({ page }) => {
  await page.click('[data-product="latte-vainilla"]')
  await expect(page.locator('.modifier-modal')).toBeVisible()
})

test('seleccionar modificadores actualiza precio', async ({ page }) => {
  await page.click('[data-modifier="avena"]')
  await expect(page.locator('.item-total')).toContainText('Q32')
})
```

---

## 6. Datos Semilla

```sql
INSERT INTO modifier_groups (name, required, max_selections, display_order) VALUES
('Tipo de Leche', FALSE, 1, 1),
('Tamaño', FALSE, 1, 2),
('Temperatura', FALSE, 1, 3),
('Extras', FALSE, 3, 4);

INSERT INTO modifier_options (group_id, name, price_adjustment, display_order) VALUES
-- Tipo de Leche (group 1)
(1, 'Entera', 0, 1),
(1, 'Deslactosada', 0, 2),
(1, 'Avena', 4.00, 3),
(1, 'Almendras', 5.00, 4),
(1, 'Soya', 4.00, 5),
(1, 'Coco', 5.00, 6),
-- Tamaño (group 2)
(2, 'Chico 8oz', -4.00, 1),
(2, 'Mediano 12oz', 0.00, 2),
(2, 'Grande 16oz', 4.00, 3),
-- Temperatura (group 3)
(3, 'Caliente', 0.00, 1),
(3, 'Frío', 0.00, 2),
-- Extras (group 4)
(4, 'Shot Extra', 6.00, 1),
(4, 'Vainilla', 4.00, 2),
(4, 'Caramelo', 4.00, 3),
(4, 'Avellana', 4.00, 4),
(4, 'Miel', 3.00, 5),
(4, 'Espuma Extra', 3.00, 6);

-- Asignar grupos a productos (ejemplos)
INSERT INTO product_modifier_groups (product_id, group_id) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),  -- Latte Vainilla: todos
(2, 1), (2, 2),                    -- Flat White: leche y tamaño
(3, 2), (3, 4),                    -- Cold Brew: tamaño y extras
(5, 2);                            -- Espresso: solo tamaño
```

---

## 7. Criterios de Aceptación

- [ ] Modal de modificadores aparece al seleccionar producto con modificadores
- [ ] Selección de leche/tamaño/temperatura es única (radio)
- [ ] Selección de extras es múltiple (máx 3)
- [ ] Precio se actualiza en tiempo real al seleccionar modificadores
- [ ] Productos sin modificadores se agregan directamente al ticket
- [ ] Modificadores se guardan como IDs en order_items
- [ ] Labels se resuelven al mostrar la orden
