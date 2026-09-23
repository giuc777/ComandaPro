# Fase 4: Órdenes y Terminal POS

## Objetivo
Implementar el flujo de órdenes del terminal POS: crear orden, agregar productos,
**pausar la orden** y gestionar las órdenes pausadas para su posterior cobro.

---

## ⚠️ Alcance actual (KDS NO implementado)

Por ahora **el módulo de cocina (KDS) no está implementado**. En consecuencia:

- El POS **NO envía la orden a cocina**.
- El POS **pausa la orden** (status `pausada`) y le asocia un **nombre de cliente**
  (si no se captura, se genera una etiqueta automática tipo `Orden #1049`).
- Las órdenes pausadas se **listan** para identificarlas por nombre de cliente.
- Desde la lista se puede **retomar** (editar) o **cobrar**.
- El cobro se registra **manualmente** (ver FASE_06).

El envío a cocina y los estados `enviada / preparando / lista / completada` quedan
**documentados para el futuro** en FASE_05, pero **fuera del alcance actual**.

---

## Estados de Orden (en español)

| Estado | Descripción | Disponible ahora |
|--------|-------------|------------------|
| `pausada` | Orden pausada, pendiente de cobro | ✅ Sí |
| `pagada` | Orden cobrada | ✅ Sí |
| `anulada` | Orden cancelada | ✅ Sí |
| `enviada` | Enviada a cocina | ⏳ Futuro (KDS) |
| `preparando` | En preparación en cocina | ⏳ Futuro (KDS) |
| `lista` | Lista para entregar | ⏳ Futuro (KDS) |
| `completada` | Entregada / completada | ⏳ Futuro (KDS) |

> El status por defecto al crear una orden es `pausada`.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 4: Órdenes (flujo de pausado)
-- ============================================

-- La tabla orders ya existe (01_create_tables.sql). Se migra su status a español
-- y se agregan los campos necesarios para el pausado.
ALTER TABLE orders MODIFY COLUMN status
    ENUM('pausada','pagada','anulada',
         'enviada','preparando','lista','completada')
    DEFAULT 'pausada';

ALTER TABLE orders
    ADD COLUMN mode ENUM('mesa','llevar') DEFAULT 'mesa' AFTER customer_name,
    ADD COLUMN created_by INT NULL AFTER total,
    ADD COLUMN parked_at TIMESTAMP NULL AFTER created_by,
    ADD COLUMN voided_at TIMESTAMP NULL AFTER parked_at,
    ADD COLUMN voided_by INT NULL AFTER voided_at,
    ADD CONSTRAINT fk_orders_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_orders_voided_by FOREIGN KEY (voided_by) REFERENCES users(id) ON DELETE SET NULL;

-- Indices
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_table ON orders(table_id);
CREATE INDEX idx_orders_parked ON orders(status, parked_at);
CREATE INDEX idx_orders_created ON orders(created_at);
```

> La tabla `order_items` ya existe. Para el pausado **no requiere cambios**.
> Los campos de cocina (`sent`, `sent_at`, `prepared_at`) se agregarán en FASE_05.

---

## 2. Procedimientos Almacenados

```sql
-- Crear orden pausada
DELIMITER //
CREATE PROCEDURE sp_create_parked_order(
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('mesa','llevar'),
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO orders (table_id, customer_name, mode, notes, created_by, status, parked_at)
    VALUES (p_table_id, p_customer_name, p_mode, p_notes, p_created_by, 'pausada', CURRENT_TIMESTAMP);

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

-- Listar órdenes pausadas (para el panel de pausadas)
DELIMITER //
CREATE PROCEDURE sp_list_parked_orders()
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.subtotal, o.tax, o.total,
           o.created_by, u.name AS created_by_name,
           o.parked_at,
           TIMESTAMPDIFF(MINUTE, o.parked_at, NOW()) AS minutes_parked,
           (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
           (SELECT IFNULL(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS total_units
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    WHERE o.status = 'pausada'
    ORDER BY o.parked_at ASC;
END //
DELIMITER ;

-- Obtener orden con ítems
DELIMITER //
CREATE PROCEDURE sp_get_order(IN p_order_id INT)
BEGIN
    SELECT o.id, o.status, o.table_id, t.name AS table_name,
           o.customer_name, o.mode, o.notes, o.subtotal, o.tax, o.total,
           o.created_by, o.parked_at, o.voided_at
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    WHERE o.id = p_order_id;

    SELECT oi.id, oi.product_id, p.name AS product_name,
           oi.quantity, oi.unit_price, oi.modifiers, oi.modifier_labels, oi.notes
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = p_order_id;
END //
DELIMITER ;

-- Retomar / editar orden pausada
DELIMITER //
CREATE PROCEDURE sp_reopen_order(
    IN p_order_id INT,
    IN p_table_id INT,
    IN p_customer_name VARCHAR(100),
    IN p_mode ENUM('mesa','llevar'),
    IN p_notes TEXT
)
BEGIN
    UPDATE orders
    SET table_id = p_table_id,
        customer_name = p_customer_name,
        mode = p_mode,
        notes = p_notes
    WHERE id = p_order_id AND status = 'pausada' AND status <> 'anulada';
END //
DELIMITER ;

-- Anular orden (no se puede anular una ya pagada)
DELIMITER //
CREATE PROCEDURE sp_void_order(IN p_order_id INT, IN p_user_id INT)
BEGIN
    UPDATE orders
    SET status = 'anulada', voided_at = CURRENT_TIMESTAMP, voided_by = p_user_id
    WHERE id = p_order_id AND status NOT IN ('pagada', 'anulada');
END //
DELIMITER ;
```

> **Nota:** `sp_send_to_kitchen`, `sp_mark_preparing`, `sp_mark_ready` y
> `sp_mark_completed` **no se implementan por ahora**. Se especifican en FASE_05
> como trabajo futuro.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/orders` | Crear orden (status `pausada`) | Sí |
| `GET` | `/api/orders?status=pausada` | **Listar órdenes pausadas** | Sí |
| `GET` | `/api/orders/:id` | Obtener orden con ítems | Sí |
| `POST` | `/api/orders/:id/items` | Agregar ítem | Sí |
| `DELETE` | `/api/orders/:id/items/:itemId` | Quitar ítem | Sí |
| `PUT` | `/api/orders/:id` | Retomar/editar orden pausada | Sí |
| `DELETE` | `/api/orders/:id` | Anular orden | Sí |

> `POST /api/orders/:id/send` (**enviar a cocina**) **se omite** por ahora.

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   └── PosPage.jsx
├── components/
│   ├── Ticket.jsx              # Ticket/orden actual
│   ├── TicketItem.jsx          # Ítem individual en ticket
│   ├── TableSelector.jsx       # Selector de mesa
│   ├── OrderModeToggle.jsx     # Mesa / Para Llevar
│   ├── ParkedOrdersPanel.jsx   # Lista de órdenes pausadas
│   └── CustomerNameInput.jsx   # Nombre de cliente (opcional)
├── hooks/
│   └── useOrder.js             # Hook de orden actual
└── api/
    └── orders.js
```

### Flujo POS (actual, sin KDS)

```
1. [Seleccionar mesa] o [Para Llevar]
2. Capturar [Nombre de Cliente] (opcional → etiqueta automática "Orden #N")
3. Agregar productos → Ticket
4. Editar cantidades / eliminar ítems
5. [Pausar Orden] → POST /api/orders (status 'pausada')
6. La orden aparece en el panel de Órdenes Pausadas
7. [Retomar] → recarga el ticket para editar
8. [Cobrar] → FASE_06 (pago manual) → status 'pagada'
```

### Layout del POS (pausadas)

```
┌─────────────────────────────────────────────────────┐
│  Orden #1049        [En Mesa] [Para Llevar]         │
│  Cliente: [ Ana G.           ]                       │
├───────────────────────────────┬─────────────────────┤
│   Productos                   │   Ticket            │
│   ┌─────┐ ┌─────┐             │   ┌───────────┐     │
│   │Prod1│ │Prod2│             │   │ Item 1    │     │
│   └─────┘ └─────┘             │   │ Item 2    │     │
│                               │   ├───────────┤     │
│                               │   │ Subtotal  │     │
│                               │   │ IVA       │     │
│                               │   │ Total     │     │
│                               │   └───────────┘     │
│                               │   [Pausar Orden]    │
├───────────────────────────────┴─────────────────────┤
│  ÓRDENES PAUSADAS (3)                                │
│  ┌───────────────────────────────────────────────┐  │
│  │ Ana G.   · 3 items · Q84.00 · hace 5 min      │  │
│  │ [Retomar] [Cobrar] [Anular]                    │  │
│  ├───────────────────────────────────────────────┤  │
│  │ Orden #1050 · 1 item · Q28.00 · hace 2 min     │  │
│  │ [Retomar] [Cobrar] [Anular]                    │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Pruebas

### Jest:
```javascript
describe('Order System (pausado)', () => {
  test('crear orden retorna order_id con status pausada')
  test('agregar ítem actualiza subtotal')
  test('agregar ítem con modificadores calcula precio correcto')
  test('listar pausadas retorna solo status pausada')
  test('anular orden cambia status a anulada')
  test('no se puede anular orden ya pagada')
  test('cliente vacio genera etiqueta automatica')
})
```

### Playwright:
```javascript
test('flujo POS: crear orden y pausarla', async ({ page }) => {
  await page.goto('/pos')
  await page.click('[data-product="latte-vainilla"]')
  await page.fill('[data-testid="customer-name"]', 'Ana G.')
  await page.click('button:has-text("Pausar Orden")')
  await expect(page.locator('.toast-success')).toContainText('Orden pausada')
  await expect(page.locator('.parked-order')).toContainText('Ana G.')
})
```

---

## 6. Criterios de Aceptación

- [x] Se puede crear orden con **mesa** o **para llevar**
- [x] Se captura **nombre de cliente**; si está vacío se usa etiqueta automática
- [x] Ítems se agregan al ticket con precio correcto
- [x] Modificadores se guardan y muestran correctamente
- [x] **Pausar Orden** guarda la orden con status `pausada`
- [x] El panel de **Órdenes Pausadas** lista las órdenes por nombre de cliente
- [x] Se puede **retomar** una orden pausada para editarla
- [x] Se puede **anular** una orden (no pagadas)
- [x] **NO** se envía la orden a cocina (fuera de alcance)
- [x] KDS permanece como "Próximamente"

---

## 7. Notas de Implementación

### Persistencia del ticket (modelo elegido)
El ticket se construye en estado de React (`hooks/useOrder.js`). Al **Pausar** se
envía la orden completa con todos sus ítems en **una sola transacción**
(`orderController.createOrder`), evitando órdenes huérfanas y peticiones
encadenadas. Al **Retomar**, se recarga la orden y se edita; guardar usa
`PUT /api/orders/:id` que **reemplaza** los ítems (`sp_clear_order_items` + inserción).

### Endpoints extra (más allá del spec)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/tables` | Lista de mesas para el selector (FASE 09 hará el CRUD completo) |

`POST /api/orders` acepta un arreglo opcional `items[]` para crear la orden con
sus ítems en una transacción. `PUT /api/orders/:id` acepta `items[]` opcional
para reemplazar los ítems.

### Datos de mesas
La tabla `tables` se sembró con 8 mesas alineadas al catálogo `mesas`
(grupo 8): Mesa 1-3, Terraza A/B, Barra Principal, Sala Privada, Area de Estudio.
FASE 09 (Mesas) reconciliará el modelo completo.

### Botón Cobrar
Navega a `/caja?order=<id>` donde se registra el pago (FASE 06). Se requiere
un turno de caja abierto (FASE 10); sin turno, la pantalla de cobro muestra un
aviso y bloquea el botón.

### Base de datos
- Migración: `database/migrations/006_fase4_orders.sql`
- Procedimientos: `database/procedures/006_order_procedures.sql`
- IVA: 12% (hardcoded en `sp_recalculate_order_totals`, coincide con el frontend)