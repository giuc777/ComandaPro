# Fase 5: Kitchen Display System (KDS)

> ## 🚧 ESTADO: NO IMPLEMENTADO POR AHORA
>
> El módulo de cocina (KDS) **no se implementa en el alcance actual**.
> La interfaz debe mostrarse como **"Próximamente"** y la navegación
> puede ocultarse o mostrarse deshabilitada.
>
> Mientras el KDS no exista, el flujo de órdenes es el de **pausado**
> (ver FASE_04): el POS no envía nada a cocina; las órdenes quedan
> `pausada` y se cobran manualmente (FASE_06).
>
> Este documento queda como **especificación futura**.

---

## Objetivo (futuro)
Implementar las pantallas de cocina para gestionar el flujo de órdenes:
enviada → preparando → lista → completada.

---

## Dependencia
Requiere FASE_04 (Órdenes POS) implementada con el flujo de pausado ya establecido.

---

## 1. Tablas SQL (a agregar cuando se implemente)

No se crean tablas nuevas. Se extienden las existentes:

```sql
-- Agregar estados de cocina al ENUM existente (ya definidos en FASE_04)
-- status: 'enviada','preparando','lista','completada'
-- (pausada, pagada, anulada ya existen)

-- Campos de cocina en orders
ALTER TABLE orders
    ADD COLUMN sent_at TIMESTAMP NULL AFTER parked_at,
    ADD COLUMN ready_at TIMESTAMP NULL AFTER sent_at;

-- Campos de cocina en order_items
ALTER TABLE order_items
    ADD COLUMN sent BOOLEAN DEFAULT FALSE AFTER notes,
    ADD COLUMN sent_at TIMESTAMP NULL AFTER sent,
    ADD COLUMN prepared_at TIMESTAMP NULL AFTER sent_at;

CREATE INDEX idx_orders_kds ON orders(status, sent_at);
```

> Estos estados se activan **cuando el KDS exista**. Antes de eso, el status
> por defecto sigue siendo `pausada`.

---

## 2. Procedimientos Almacenados (futuro)

```sql
-- Enviar a cocina (ya NO se usa en el flujo actual de pausado)
DELIMITER //
CREATE PROCEDURE sp_send_to_kitchen(IN p_order_id INT)
BEGIN
    UPDATE order_items
    SET sent = TRUE, sent_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id AND sent = FALSE;

    UPDATE orders SET status = 'enviada', sent_at = CURRENT_TIMESTAMP
    WHERE id = p_order_id AND status = 'pausada';
END //
DELIMITER ;

-- Obtener órdenes para KDS (enviada y preparando)
DELIMITER //
CREATE PROCEDURE sp_get_kds_orders()
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.created_at,
           TIMESTAMPDIFF(MINUTE, o.sent_at, NOW()) AS minutes_waiting,
           u.name AS created_by_name
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status IN ('enviada', 'preparando')
    ORDER BY o.sent_at ASC;
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
    UPDATE orders SET status = 'preparando' WHERE id = p_order_id;
    UPDATE order_items SET prepared_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id AND prepared_at IS NULL;
END //
DELIMITER ;

-- Marcar como lista
DELIMITER //
CREATE PROCEDURE sp_mark_ready(IN p_order_id INT)
BEGIN
    UPDATE orders SET status = 'lista', ready_at = CURRENT_TIMESTAMP WHERE id = p_order_id;
END //
DELIMITER ;

-- Marcar como completada
DELIMITER //
CREATE PROCEDURE sp_mark_completed(IN p_order_id INT)
BEGIN
    UPDATE orders SET status = 'completada' WHERE id = p_order_id;
END //
DELIMITER ;
```

---

## 3. Endpoints REST (futuro)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/orders/:id/send` | Enviar a cocina | Sí |
| `GET` | `/api/kds/orders` | Órdenes enviada + preparando | Sí |
| `GET` | `/api/kds/orders/:id/items` | Ítems de una orden | Sí |
| `PUT` | `/api/kds/orders/:id/preparing` | Marcar preparando | Sí |
| `PUT` | `/api/kds/orders/:id/ready` | Marcar lista | Sí |
| `PUT` | `/api/kds/orders/:id/completed` | Marcar completada | Sí |

---

## 4. Componentes React (futuro)

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

### Estado actual de la UI

- `KdsPage.jsx` debe mostrar un **placeholder "Próximamente"**.
- `Sidebar.jsx` / `MobileNav.jsx`: el ítem "Cocina" se oculta o se muestra
  deshabilitado.
- `Dashboard.jsx`: los accesos a KDS ("Mi Cocina", "Ver todas") se ocultan
  o se marcan como próximos.

### Layout KDS Móvil (futuro)
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

### Layout KDS Escritorio (futuro)
```
┌──────────┬──────────┬──────────┬──────────┐
│ Mesa 1   │ Mesa 3   │ Mesa 5   │ Para Llevar│
│ ⏱ 3 min  │ ⏱ 5 min  │ ⏱ 2 min  │ ⏱ 8 min  │
│ 2 items  │ 3 items  │ 1 item   │ 4 items  │
│ [Prep]   │ [Listo]  │ [Prep]   │ [Listo]  │
└──────────┴──────────┴──────────┴──────────┘
```

---

## 5. Pruebas (futuro)

### Jest:
```javascript
describe('KDS System', () => {
  test('obtener órdenes KDS retorna enviada y preparando')
  test('marcar preparando actualiza status')
  test('marcar lista agrega ready_at timestamp')
  test('no muestra órdenes completadas o anuladas')
})
```

### Playwright:
```javascript
test('KDS muestra órdenes enviadas', async ({ page }) => {
  await page.goto('/kds')
  await expect(page.locator('.kds-card')).toHaveCount(2)
})
```

---

## 6. Criterios de Aceptación (futuro)

- [ ] KDS muestra órdenes en status "enviada" y "preparando"
- [ ] Cada tarjeta muestra: mesa, cliente, tiempo de espera, ítems
- [ ] Botón "Preparando" cambia status y color de tarjeta
- [ ] Botón "Lista" cambia status y notifica al POS
- [ ] KDS desktop muestra vista grid responsive
- [ ] KDS mobile muestra tarjetas apiladas
- [ ] Órdenes completadas desaparecen del KDS

---

## 7. Criterios de Aceptación (actual — placeholder)

- [ ] La página `/kds` muestra "Próximamente"
- [ ] El ítem de navegación "Cocina" se oculta o deshabilita
- [ ] Ningún flujo actual envía órdenes a cocina