# Fase 6: Pagos y Recibos

## Objetivo
Implementar el **registro manual de cobros** de órdenes pausadas, con métodos
`efectivo`, `tarjeta` y `qr`, cálculo de cambio y generación de recibo.

---

## ⚠️ Alcance actual: cobro MANUAL

El sistema **NO procesa** pagos con tarjeta ni QR. El cajero realiza el cobro
en la terminal física (o recibe el pago) y **el sistema solo registra** cómo se
pagó. Es decir:

- **Efectivo:** se captura el monto entregado y el sistema calcula el cambio.
- **Tarjeta:** se registra que se cobró con tarjeta (sin integración a POS bancario).
- **QR:** se registra que se cobró por QR (sin generación de código ni validación).

En los tres casos el resultado es el mismo: se registra el pago y la orden pasa
a `pagada`. **No hay integración con pasarelas de pago.**

---

## Dependencia
Requiere FASE_04 (Órdenes POS — flujo de pausado). Se cobra una orden en
status `pausada`.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 6: Pagos (cobro manual)
-- ============================================

-- La tabla payments ya existe (01_create_tables.sql).
-- Migrar el enum de método a español:
ALTER TABLE payments MODIFY COLUMN method
    ENUM('efectivo','tarjeta','qr') NOT NULL;

-- Campos para trazabilidad del cobro
ALTER TABLE payments
    ADD COLUMN cashier_id INT NULL AFTER change_amount,
    ADD COLUMN sat_invoice VARCHAR(50) NULL AFTER cashier_id,
    ADD CONSTRAINT fk_payments_cashier FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE SET NULL;

-- Indices
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_method ON payments(method);
```

> Columnas existentes que se conservan:
> `amount` (monto cobrado = total de la orden), `amount_given` (montos recibidos),
> `change_amount` (cambio).

---

## 2. Procedimientos Almacenados

```sql
-- Registrar pago (manual) de una orden pausada
DELIMITER //
CREATE PROCEDURE sp_record_payment(
    IN p_order_id INT,
    IN p_method ENUM('efectivo','tarjeta','qr'),
    IN p_amount_given DECIMAL(10,2),
    IN p_cashier_id INT,
    IN p_sat_invoice VARCHAR(50)
)
BEGIN
    DECLARE v_total DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);
    DECLARE v_change DECIMAL(10,2) DEFAULT 0;

    -- Validar estado de la orden
    SELECT total, status INTO v_total, v_status FROM orders WHERE id = p_order_id;

    IF v_status <> 'pausada' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Solo se pueden cobrar ordenes en estado pausada';
    END IF;

    -- Calcular cambio (solo efectivo)
    IF p_method = 'efectivo' AND p_amount_given IS NOT NULL THEN
        SET v_change = p_amount_given - v_total;
    END IF;

    -- Insertar pago
    INSERT INTO payments (order_id, method, amount, amount_given, change_amount, cashier_id, sat_invoice)
    VALUES (p_order_id, p_method, v_total, p_amount_given, v_change, p_cashier_id, p_sat_invoice);

    -- Actualizar orden a pagada
    UPDATE orders SET status = 'pagada' WHERE id = p_order_id;

    -- Liberar mesa (queda sucia para limpieza)
    UPDATE tables SET status = 'dirty', current_order_id = NULL
    WHERE current_order_id = p_order_id;

    SELECT LAST_INSERT_ID() AS payment_id, v_change AS change_amount;
END //
DELIMITER ;

-- Obtener pagos del día
DELIMITER //
CREATE PROCEDURE sp_get_daily_payments(IN p_date DATE)
BEGIN
    SELECT p.id, p.order_id, o.customer_name, p.method, p.amount,
           p.amount_given, p.change_amount, u.name AS cashier_name,
           p.sat_invoice, p.created_at
    FROM payments p
    JOIN orders o ON p.order_id = o.id
    LEFT JOIN users u ON p.cashier_id = u.id
    WHERE DATE(p.created_at) = p_date
    ORDER BY p.created_at DESC;
END //
DELIMITER ;

-- Resumen de ventas del día
DELIMITER //
CREATE PROCEDURE sp_get_daily_sales_summary(IN p_date DATE)
BEGIN
    SELECT
        IFNULL(SUM(amount), 0) AS total_sales,
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_sales,
        IFNULL(SUM(CASE WHEN method = 'tarjeta'  THEN amount ELSE 0 END), 0) AS card_sales,
        IFNULL(SUM(CASE WHEN method = 'qr'       THEN amount ELSE 0 END), 0) AS qr_sales,
        COUNT(*) AS transaction_count
    FROM payments
    WHERE DATE(created_at) = p_date;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/payments` | Registrar pago manual | Sí |
| `GET` | `/api/payments/daily` | Pagos del día (?date=) | Sí |
| `GET` | `/api/payments/daily/summary` | Resumen de ventas | Sí |
| `GET` | `/api/payments/:id` | Detalle de pago | Sí |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   └── PaymentPage.jsx         # Pantalla de cobro
├── components/
│   ├── PaymentMethodSelector.jsx   # Efectivo / Tarjeta / QR
│   ├── CashPayment.jsx             # Formulario efectivo (monto recibido)
│   ├── CardPayment.jsx             # Registro tarjeta (manual)
│   ├── QRPayment.jsx               # Registro QR (manual)
│   ├── ReceiptModal.jsx            # Modal de recibo
│   └── SATInvoiceToggle.jsx        # Checkbox facturación
└── api/
    └── payments.js
```

### Layout Payment

```
┌─────────────────────────────────────┐
│  Orden #1049 · Ana G.               │
│  Total: Q36.00                      │
├─────────────────────────────────────┤
│  [Efectivo]  [Tarjeta]  [QR]        │
├─────────────────────────────────────┤
│  Efectivo:                          │
│  Recibido: [_________] Q            │
│  Cambio:   Q0.00                    │
│                                     │
│  ☐ Facturación SAT                  │
├─────────────────────────────────────┤
│  [Cobrar Q36.00]                    │
└─────────────────────────────────────┘
```

> Para **Tarjeta** y **QR** no hay formulario adicional: solo se confirma el
> registro del método. El cobro real ocurre fuera del sistema.

### Recibo post-pago

```
┌─────────────────────────┐
│    DeerCoffee           │
│    Roma Norte           │
├─────────────────────────┤
│  Orden: #1049           │
│  Mesa: 3                │
│  Fecha: 14/09/2026      │
├─────────────────────────┤
│  1x Latte Vainilla Q36  │
│    Avena, Grande         │
├─────────────────────────┤
│  Subtotal:  Q32.14      │
│  IVA 12%:   Q3.86       │
│  Total:     Q36.00      │
├─────────────────────────┤
│  Pago: Efectivo Q40.00  │
│  Cambio: Q4.00          │
└─────────────────────────┘
```

---

## 5. Pruebas

### Jest:
```javascript
describe('Payment System (manual)', () => {
  test('registrar pago efectivo calcula cambio correctamente')
  test('registrar pago tarjeta no requiere amount_given')
  test('registrar pago qr registra metodo qr')
  test('solo se puede cobrar orden en estado pausada')
  test('pago actualiza status de orden a pagada')
  test('pago libera mesa')
  test('resumen del día suma correctamente por método')
})
```

### Playwright:
```javascript
test('flujo de cobro completo', async ({ page }) => {
  // Desde una orden pausada
  await page.goto('/pos')
  await page.click('.parked-order [data-action="cobrar"]')
  await page.click('[data-method="efectivo"]')
  await page.fill('input[name="amount_given"]', '40')
  await expect(page.locator('.change')).toContainText('Q4.00')
  await page.click('button:has-text("Cobrar")')
  await expect(page.locator('.receipt-modal')).toBeVisible()
})
```

---

## 6. Criterios de Aceptación

- [x] Selección de método de pago: **efectivo, tarjeta, qr**
- [x] Cálculo de cambio solo para efectivo
- [x] Tarjeta y QR solo **registran** el método (sin procesar pago)
- [x] Solo se pueden cobrar órdenes en estado `pausada`
- [x] Pago registra en tabla `payments` con `cashier_id`
- [x] Orden cambia status a `pagada`
- [x] Mesa se libera (status = dirty)
- [x] Recibo muestra detalles completos
- [ ] Opcional: facturación SAT con número
- [x] Resumen del día se actualiza por método

---

## 7. Notas de Implementación

### Pantalla de cobro
`CajaPage` detecta `?order=<id>` y muestra el formulario de cobro con el resumen
de la orden, selector de metodo, formulario de efectivo (con presets y calculo en
vivo) y boton de cobrar. Sin `?order=` muestra la pantalla de caja/turnos
(placeholder FASE_10).

### Flujo de cobro
1. El POS (ParkedOrdersPanel) navega a `/caja?order=<id>` al presionar "Cobrar"
2. CajaPage carga la orden con items via `GET /api/orders/:id`
3. Selecciona metodo de pago
4. Si efectivo: formulario con monto recibido + calculo de cambio + presets (Q25, Q50, Q100)
5. Boton "Cobrar Q XX.00" llama `POST /api/payments`
6. Backend: `sp_record_payment` valida status=pausada, calcula cambio, inserta pago, cambia orden a pagada, libera mesa
7. Frontend muestra modal de recibo y redirige a `/pos`

### Vinculacion mesa-orden
`sp_create_parked_order` ahora vincula la mesa (`tables.status='occupied'`,
`tables.current_order_id`) cuando se crea una orden con mesa. `sp_record_payment`
la libera (`tables.status='dirty'`, `current_order_id=NULL`).

### Archivos
- `database/migrations/007_fase6_payments.sql`
- `database/procedures/007_payment_procedures.sql`
- `back-end/src/controllers/paymentController.js`
- `back-end/src/routes/payments.js`
- `front-end/src/pages/CajaPage.jsx`
- `front-end/src/components/PaymentMethodSelector.jsx`
- `front-end/src/components/CashPaymentForm.jsx`
- `front-end/src/components/ReceiptModal.jsx`