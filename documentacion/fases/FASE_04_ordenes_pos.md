# Fase 4: Órdenes y Terminal POS

## Objetivo
Implementar el flujo completo de órdenes: crear, enviar a cocina, gestionar estado, y el terminal POS completo.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 4: Órdenes
-- ============================================

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status ENUM('received', 'preparing', 'ready', 'completed', 'paid', 'voided', 'refunded') DEFAULT 'received',
    table_id INT,
    customer_name VARCHAR(100),
    mode ENUM('dine-in', 'takeaway') DEFAULT 'dine-in',
    notes TEXT,
    subtotal DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) DEFAULT 0,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    ready_at TIMESTAMP NULL,
    voided_at TIMESTAMP NULL,
    voided_by INT NULL,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    modifiers JSON,
    modifier_labels TEXT,
    notes TEXT,
    sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    prepared_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_created ON orders(created_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
```

---

## 2. Procedimientos Almacenados

```sql
-- Crear orden
DELIMITER //
CREATE PROCEDURE sp_create_order(
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('dine-in', 'takeaway'),
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO orders (table_id, customer_name, mode, notes, created_by)
    VALUES (p_table_id, p_customer_name, p_mode, p_notes, p_created_by);

    SELECT LAST_INSERT_ID() AS order_id;
END //
DELIMITER ;

-- Agregar ítem a orden
DELIMITER //
CREATE PROCEDURE sp_add_order_item(
    IN p_order_id INT,
    IN p_product_id INT,
    IN p_quantity INT,
    IN p_unit_price DECIMAL(10,2),
    IN p_modifiers JSON,
    IN p_modifier_labels TEXT,
    IN p_notes TEXT
)
BEGIN
    INSERT INTO order_items (order_id, product_id, quantity, unit_price, modifiers, modifier_labels, notes)
    VALUES (p_order_id, p_product_id, p_quantity, p_unit_price, p_modifiers, p_modifier_labels, p_notes);

    -- Actualizar totales de la orden
    CALL sp_recalculate_order_totals(p_order_id);

    SELECT LAST_INSERT_ID() AS item_id;
END //
DELIMITER ;

-- Recalcular totales de orden
DELIMITER //
CREATE PROCEDURE sp_recalculate_order_totals(IN p_order_id INT)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,4) DEFAULT 0.12;

    SELECT IFNULL(SUM(quantity * unit_price), 0) INTO v_subtotal
    FROM order_items WHERE order_id = p_order_id;

    UPDATE orders
    SET subtotal = v_subtotal,
        tax = v_subtotal * v_tax_rate,
        total = v_subtotal + (v_subtotal * v_tax_rate)
    WHERE id = p_order_id;
END //
DELIMITER ;

-- Enviar a cocina (marcar items como sent)
DELIMITER //
CREATE PROCEDURE sp_send_to_kitchen(IN p_order_id INT)
BEGIN
    UPDATE order_items
    SET sent = TRUE, sent_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id AND sent = FALSE;

    -- Si la orden es nueva, crearla con status received
    UPDATE orders SET status = 'received' WHERE id = p_order_id AND status IS NULL;
END //
DELIMITER ;

-- Actualizar estado de orden
DELIMITER //
CREATE PROCEDURE sp_update_order_status(
    IN p_order_id INT,
    IN p_new_status ENUM('received', 'preparing', 'ready', 'completed', 'paid', 'voided')
)
BEGIN
    UPDATE orders SET status = p_new_status WHERE id = p_order_id;

    IF p_new_status = 'preparing' THEN
        UPDATE order_items SET prepared_at = CURRENT_TIMESTAMP
        WHERE order_id = p_order_id AND prepared_at IS NULL;
    END IF;

    IF p_new_status = 'ready' THEN
        UPDATE orders SET ready_at = CURRENT_TIMESTAMP WHERE id = p_order_id;
    END IF;
END //
DELIMITER ;

-- Obtener órdenes por status (para KDS)
DELIMITER //
CREATE PROCEDURE sp_get_orders_by_status(IN p_status VARCHAR(20))
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.created_at, o.ready_at,
           u.name AS created_by_name,
           oi.id AS item_id, oi.product_id, p.name AS product_name,
           oi.quantity, oi.unit_price, oi.modifier_labels, oi.sent, oi.prepared_at
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    JOIN users u ON o.created_by = u.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.status = p_status
    ORDER BY o.created_at ASC;
END //
DELIMITER ;

-- Anular orden
DELIMITER //
CREATE PROCEDURE sp_void_order(IN p_order_id INT, IN p_user_id INT)
BEGIN
    UPDATE orders
    SET status = 'voided', voided_at = CURRENT_TIMESTAMP, voided_by = p_user_id
    WHERE id = p_order_id AND status NOT IN ('paid', 'voided', 'refunded');
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/orders` | Crear orden | Sí |
| `GET` | `/api/orders` | Listar órdenes (?status=) | Sí |
| `GET` | `/api/orders/:id` | Obtener orden con ítems | Sí |
| `POST` | `/api/orders/:id/items` | Agregar ítem | Sí |
| `DELETE` | `/api/orders/:id/items/:itemId` | Quitar ítem | Sí |
| `POST` | `/api/orders/:id/send` | Enviar a cocina | Sí |
| `PUT` | `/api/orders/:id/status` | Cambiar estado | Sí |
| `DELETE` | `/api/orders/:id` | Anular orden | Sí |
| `GET` | `/api/orders/table/:tableId` | Orden activa de mesa | Sí |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   └── POSPage.jsx
├── components/
│   ├── Ticket.jsx             # Ticket/orden actual
│   ├── TicketItem.jsx         # Ítem individual en ticket
│   ├── TableSelector.jsx      # Selector de mesa
│   ├── OrderModeToggle.jsx    # Dine-in / Takeaway
│   └── HoldRecallButtons.jsx  # Botones pausar/retomar
├── hooks/
│   └── useOrder.js            # Hook de orden actual
└── api/
    └── orders.js
```

### Flujo POS completo:
```
1. Seleccionar mesa (o takeaway)
2. Agregar productos → ModifierModal → Ticket
3. Editar cantidades/eliminar ítems
4. [Pausar] → guarda en parkedOrders
5. [Enviar a Cocina] → POST /api/orders/:id/send
6. Mesa se marca como "occupied"
```

---

## 5. Pruebas

### Jest:
```javascript
describe('Order System', () => {
  test('crear orden retorna order_id')
  test('agregar ítem actualiza subtotal')
  test('agregar ítem con modificadores calcula precio correcto')
  test('enviar a cocina marca items como sent')
  test('anular orden cambia status a voided')
  test('no se puede anular orden ya pagada')
})
```

### Playwright:
```javascript
test('flujo completo POS: crear orden y enviar a cocina', async ({ page }) => {
  await page.goto('/#/pos')
  await page.click('[data-product="latte-vainilla"]')
  // seleccionar modificadores
  await page.click('[data-modifier="avena"]')
  await page.click('.modifier-confirm')
  // enviar a cocina
  await page.click('button:has-text("Enviar a Cocina")')
  await expect(page.locator('.toast-success')).toContainText('Enviado a cocina')
})
```

---

## 6. Criterios de Aceptación

- [ ] Se puede crear orden con mesa o takeaway
- [ ] Ítems se agregan al ticket con precio correcto
- [ ] Modificadores se guardan y muestran correctamente
- [ ] Enviar a cocina cambia status a "received"
- [ ] KDS puede cambiar status a "preparing" y "ready"
- [ ] Anular orden libera mesa y cambia status
- [ ] Hold/Recall funciona para pausar y retomar órdenes
