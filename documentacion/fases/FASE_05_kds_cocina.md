# Fase 5: Kitchen Display System (KDS)

## Objetivo
Implementar las pantallas de cocina para gestionar el flujo de órdenes: received → preparing → ready → completed.

---

## 1. Tablas SQL

No se crean tablas nuevas. Se usa la tabla `orders` de la Fase 4 con los campos:
- `status`: received, preparing, ready, completed
- `ready_at`: timestamp cuando estuvo listo

---

## 2. Procedimientos Almacenados

```sql
-- Obtener órdenes para KDS (received y preparing)
DELIMITER //
CREATE PROCEDURE sp_get_kds_orders()
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.created_at,
           TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS minutes_waiting,
           u.name AS created_by_name
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    JOIN users u ON o.created_by = u.id
    WHERE o.status IN ('received', 'preparing')
    ORDER BY o.created_at ASC;
END //
DELIMITER ;

-- Obtener ítems de una orden para KDS
DELIMITER //
CREATE PROCEDURE sp_get_order_items_for_kds(IN p_order_id INT)
BEGIN
    SELECT oi.id, oi.product_id, p.name AS product_name,
           oi.quantity, oi.modifier_labels, oi.sent, oi.prepared_at,
           o.status AS order_status
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.order_id = p_order_id
    ORDER BY oi.created_at;
END //
DELIMITER ;

-- Marcar como preparando
DELIMITER //
CREATE PROCEDURE sp_mark_preparing(IN p_order_id INT)
BEGIN
    UPDATE orders SET status = 'preparing' WHERE id = p_order_id;
    UPDATE order_items SET prepared_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id AND prepared_at IS NULL;
END //
DELIMITER ;

-- Marcar como listo
DELIMITER //
CREATE PROCEDURE sp_mark_ready(IN p_order_id INT)
BEGIN
    UPDATE orders SET status = 'ready', ready_at = CURRENT_TIMESTAMP WHERE id = p_order_id;
END //
DELIMITER ;

-- Marcar como completado
DELIMITER //
CREATE PROCEDURE sp_mark_completed(IN p_order_id INT)
BEGIN
    UPDATE orders SET status = 'completed' WHERE id = p_order_id;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/kds/orders` | Órdenes received + preparing | Sí |
| `GET` | `/api/kds/orders/:id/items` | Ítems de una orden | Sí |
| `PUT` | `/api/kds/orders/:id/preparing` | Marcar preparando | Sí |
| `PUT` | `/api/kds/orders/:id/ready` | Marcar listo | Sí |
| `PUT` | `/api/kds/orders/:id/completed` | Marcar completado | Sí |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   ├── KDSMobilePage.jsx      # KDS para móvil
│   └── KDSDesktopPage.jsx     # KDS para escritorio
├── components/
│   ├── KDSCard.jsx            # Tarjeta de orden
│   ├── KDSItem.jsx            # Ítem en tarjeta KDS
│   └── KDSStatusBadge.jsx     # Badge de status con color
└── api/
    └── kds.js
```

### Layout KDS Móvil:
```
┌─────────────────┐
│ Mesa 3 - Juan   │
│ ⏱ 5 min         │
├─────────────────┤
│ 2x Latte Vainilla│
│   Avena, Grande  │
│                 │
│ 1x Espresso     │
│   Doble         │
├─────────────────┤
│ [Preparando]    │
│ [Listo ✓]       │
└─────────────────┘
```

### Layout KDS Escritorio (Grid):
```
┌──────────┬──────────┬──────────┬──────────┐
│ Mesa 1   │ Mesa 3   │ Mesa 5   │ Para Llevar│
│ ⏱ 3 min  │ ⏱ 5 min  │ ⏱ 2 min  │ ⏱ 8 min  │
│ 2 items  │ 3 items  │ 1 item   │ 4 items  │
│ [Prep]   │ [Listo]  │ [Prep]   │ [Listo]  │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 5. Pruebas

### Jest:
```javascript
describe('KDS System', () => {
  test('obtener órdenes KDS retorna received y preparing')
  test('marcar preparando actualiza status')
  test('marcar listo agrega ready_at timestamp')
  test('no muestra órdenes completadas o anuladas')
})
```

### Playwright:
```javascript
test('KDS muestra órdenes recibidas', async ({ page }) => {
  await page.goto('/#/kds')
  await expect(page.locator('.kds-card')).toHaveCount(2)
})

test('cambiar status a preparando actualiza tarjeta', async ({ page }) => {
  await page.click('.kds-card:first-child .btn-preparing')
  await expect(page.locator('.kds-card:first-child .status')).toContainText('Preparando')
})
```

---

## 6. Criterios de Aceptación

- [ ] KDS muestra órdenes en status "received" y "preparing"
- [ ] Cada tarjeta muestra: mesa, cliente, tiempo de espera, ítems
- [ ] Botón "Preparando" cambia status y color de tarjeta
- [ ] Botón "Listo" cambia status y notifica al POS
- [ ] KDS desktop muestra vista grid responsive
- [ ] KDS mobile muestra tarjetas apiladas
- [ ] Órdenes completadas desaparecen del KDS
