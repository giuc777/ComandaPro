# Fase 6: Pagos y Recibos

## Objetivo
Implementar el sistema de cobro con múltiples métodos de pago (efectivo, tarjeta, QR) y generación de recibos.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 6: Pagos
-- ============================================

CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    method ENUM('efectivo', 'tarjeta', 'qr') NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    tax DECIMAL(10,2) NOT NULL,
    grand_total DECIMAL(10,2) NOT NULL,
    amount_given DECIMAL(10,2),
    change_amount DECIMAL(10,2) DEFAULT 0,
    cashier_id INT NOT NULL,
    sat_invoice VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_created ON payments(created_at);
CREATE INDEX idx_payments_method ON payments(method);
```

---

## 2. Procedimientos Almacenados

```sql
-- Registrar pago
DELIMITER //
CREATE PROCEDURE sp_record_payment(
    IN p_order_id INT,
    IN p_method ENUM('efectivo', 'tarjeta', 'qr'),
    IN p_amount_given DECIMAL(10,2),
    IN p_cashier_id INT,
    IN p_sat_invoice VARCHAR(50)
)
BEGIN
    DECLARE v_subtotal DECIMAL(10,2);
    DECLARE v_tax DECIMAL(10,2);
    DECLARE v_grand_total DECIMAL(10,2);
    DECLARE v_change DECIMAL(10,2) DEFAULT 0;

    -- Obtener totales de la orden
    SELECT subtotal, tax, total INTO v_subtotal, v_tax, v_grand_total
    FROM orders WHERE id = p_order_id;

    -- Calcular cambio (solo efectivo)
    IF p_method = 'efectivo' AND p_amount_given IS NOT NULL THEN
        SET v_change = p_amount_given - v_grand_total;
    END IF;

    -- Insertar pago
    INSERT INTO payments (order_id, method, subtotal, tax, grand_total,
                          amount_given, change_amount, cashier_id, sat_invoice)
    VALUES (p_order_id, p_method, v_subtotal, v_tax, v_grand_total,
            p_amount_given, v_change, p_cashier_id, p_sat_invoice);

    -- Actualizar orden
    UPDATE orders SET status = 'paid' WHERE id = p_order_id;

    -- Liberar mesa
    UPDATE tables SET status = 'dirty', current_order_id = NULL
    WHERE current_order_id = p_order_id;

    SELECT LAST_INSERT_ID() AS payment_id, v_change AS change_amount;
END //
DELIMITER ;

-- Obtener pagos del día
DELIMITER //
CREATE PROCEDURE sp_get_daily_payments(IN p_date DATE)
BEGIN
    SELECT p.id, p.order_id, p.method, p.subtotal, p.tax, p.grand_total,
           p.amount_given, p.change_amount, u.name AS cashier_name,
           p.sat_invoice, p.created_at
    FROM payments p
    JOIN users u ON p.cashier_id = u.id
    WHERE DATE(p.created_at) = p_date
    ORDER BY p.created_at DESC;
END //
DELIMITER ;

-- Resumen de ventas del día
DELIMITER //
CREATE PROCEDURE sp_get_daily_sales_summary(IN p_date DATE)
BEGIN
    SELECT
        IFNULL(SUM(grand_total), 0) AS total_sales,
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN grand_total ELSE 0 END), 0) AS cash_sales,
        IFNULL(SUM(CASE WHEN method = 'tarjeta' THEN grand_total ELSE 0 END), 0) AS card_sales,
        IFNULL(SUM(CASE WHEN method = 'qr' THEN grand_total ELSE 0 END), 0) AS qr_sales,
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
| `POST` | `/api/payments` | Registrar pago | Sí |
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
│   ├── PaymentMethodSelector.jsx
│   ├── CashPayment.jsx         # Formulario efectivo
│   ├── CardPayment.jsx         # Formulario tarjeta
│   ├── QRPayment.jsx           # Código QR
│   ├── ReceiptModal.jsx        # Modal de recibo
│   └── SATInvoiceToggle.jsx    # Checkbox facturación
└── api/
    └── payments.js
```

### Layout Payment:
```
┌─────────────────────────────────────┐
│  Total: Q36.00                      │
├─────────────────────────────────────┤
│  [Efectivo]  [Tarjeta]  [QR]       │
├─────────────────────────────────────┤
│  Efectivo:                          │
│  [_________] Q                     │
│  Cambio: Q0.00                      │
│                                     │
│  ☐ Facturación SAT                  │
├─────────────────────────────────────┤
│  [Cobrar Q36.00]                   │
└─────────────────────────────────────┘
```

### Recibo post-pago:
```
┌─────────────────────────┐
│    ComandaPro           │
│    Deep Coffee          │
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
describe('Payment System', () => {
  test('registrar pago efectivo calcula cambio correctamente')
  test('registrar pago tarjeta no requiere amount_given')
  test('pago actualiza status de orden a paid')
  test('pago libera mesa')
  test('resumen del día suma correctamente por método')
})
```

### Playwright:
```javascript
test('flujo de cobro completo', async ({ page }) => {
  // Crear orden y enviar a cocina
  // Cambiar status a ready
  await page.goto('/#/pos/pago')
  await page.click('[data-method="efectivo"]')
  await page.fill('input[name="amount"]', '40')
  await expect(page.locator('.change')).toContainText('Q4.00')
  await page.click('button:has-text("Cobrar")')
  await expect(page.locator('.receipt-modal')).toBeVisible()
})
```

---

## 6. Criterios de Aceptación

- [ ] Selección de método de pago (efectivo, tarjeta, QR)
- [ ] Cálculo de cambio en efectivo
- [ ] Pago registra en tabla payments
- [ ] Orden cambia status a "paid"
- [ ] Mesa se libera (status = dirty)
- [ ] Recibo muestra detalles completos
- [ ] Opcional: facturación SAT con número
- [ ] Resumen del día se actualiza
