# Fase 10: Turnos y Caja

## Objetivo
Implementar el sistema de turnos con apertura/cierre de caja, arqueo (conteo de efectivo), y historial de turnos.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 10: Turnos y Caja
-- ============================================

CREATE TABLE shifts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cashier_id INT NOT NULL,
    station VARCHAR(50) DEFAULT 'Estación 01',
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    close_time TIMESTAMP NULL,
    start_cash DECIMAL(10,2) NOT NULL,
    actual_cash DECIMAL(10,2),
    expected_cash DECIMAL(10,2),
    difference DECIMAL(10,2),
    status ENUM('open', 'closed') DEFAULT 'open',
    total_sales DECIMAL(10,2) DEFAULT 0,
    cash_sales DECIMAL(10,2) DEFAULT 0,
    card_sales DECIMAL(10,2) DEFAULT 0,
    qr_sales DECIMAL(10,2) DEFAULT 0,
    transaction_count INT DEFAULT 0,
    FOREIGN KEY (cashier_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE shift_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    shift_id INT NOT NULL,
    order_id INT,
    type ENUM('sale', 'refund', 'void') NOT NULL,
    method ENUM('efectivo', 'tarjeta', 'qr') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shift_tx_shift ON shift_transactions(shift_id);
```

---

## 2. Procedimientos Almacenados

```sql
-- Abrir turno
DELIMITER //
CREATE PROCEDURE sp_open_shift(
    IN p_cashier_id INT,
    IN p_start_cash DECIMAL(10,2),
    IN p_station VARCHAR(50)
)
BEGIN
    -- Verificar que no haya turno abierto
    IF EXISTS (SELECT 1 FROM shifts WHERE status = 'open' AND station = p_station) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ya hay un turno abierto en esta estación';
    END IF;

    INSERT INTO shifts (cashier_id, start_cash, station)
    VALUES (p_cashier_id, p_start_cash, p_station);

    SELECT LAST_INSERT_ID() AS shift_id;
END //
DELIMITER ;

-- Cerrar turno
DELIMITER //
CREATE PROCEDURE sp_close_shift(
    IN p_shift_id INT,
    IN p_actual_cash DECIMAL(10,2)
)
BEGIN
    DECLARE v_start_cash DECIMAL(10,2);
    DECLARE v_expected_cash DECIMAL(10,2);
    DECLARE v_difference DECIMAL(10,2);

    SELECT start_cash INTO v_start_cash FROM shifts WHERE id = p_shift_id;

    -- Calcular efectivo esperado
    SELECT IFNULL(start_cash + SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), start_cash)
    INTO v_expected_cash
    FROM shifts s
    LEFT JOIN shift_transactions st ON s.id = st.shift_id
    WHERE s.id = p_shift_id;

    SET v_difference = p_actual_cash - v_expected_cash;

    -- Obtener totales
    SELECT IFNULL(SUM(amount), 0) INTO @total_sales FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale';
    SELECT IFNULL(SUM(amount), 0) INTO @cash_sales FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'efectivo';
    SELECT IFNULL(SUM(amount), 0) INTO @card_sales FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'tarjeta';
    SELECT IFNULL(SUM(amount), 0) INTO @qr_sales FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale' AND method = 'qr';
    SELECT COUNT(*) INTO @tx_count FROM shift_transactions WHERE shift_id = p_shift_id AND type = 'sale';

    UPDATE shifts
    SET status = 'closed', close_time = CURRENT_TIMESTAMP,
        actual_cash = p_actual_cash, expected_cash = v_expected_cash,
        difference = v_difference,
        total_sales = @total_sales, cash_sales = @cash_sales,
        card_sales = @card_sales, qr_sales = @qr_sales,
        transaction_count = @tx_count
    WHERE id = p_shift_id;

    SELECT v_expected_cash AS expected_cash, p_actual_cash AS actual_cash, v_difference AS difference;
END //
DELIMITER ;

-- Registrar transacción de turno
DELIMITER //
CREATE PROCEDURE sp_record_shift_transaction(
    IN p_shift_id INT,
    IN p_order_id INT,
    IN p_type ENUM('sale', 'refund', 'void'),
    IN p_method ENUM('efectivo', 'tarjeta', 'qr'),
    IN p_amount DECIMAL(10,2)
)
BEGIN
    INSERT INTO shift_transactions (shift_id, order_id, type, method, amount)
    VALUES (p_shift_id, p_order_id, p_type, p_method, p_amount);
END //
DELIMITER ;

-- Obtener turno actual
DELIMITER //
CREATE PROCEDURE sp_get_current_shift()
BEGIN
    SELECT s.id, s.cashier_id, u.name AS cashier_name, s.station,
           s.start_time, s.start_cash, s.status,
           (SELECT COUNT(*) FROM shift_transactions WHERE shift_id = s.id AND type = 'sale') AS transaction_count
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'open'
    ORDER BY s.start_time DESC
    LIMIT 1;
END //
DELIMITER ;

-- Historial de turnos
DELIMITER //
CREATE PROCEDURE sp_get_shift_history(IN p_limit INT)
BEGIN
    SELECT s.id, s.cashier_id, u.name AS cashier_name, s.station,
           s.start_time, s.close_time, s.start_cash, s.expected_cash,
           s.actual_cash, s.difference, s.total_sales, s.cash_sales,
           s.card_sales, s.qr_sales, s.transaction_count
    FROM shifts s
    JOIN users u ON s.cashier_id = u.id
    WHERE s.status = 'closed'
    ORDER BY s.close_time DESC
    LIMIT p_limit;
END //
DELIMITER ;

-- Arqueo: desglose por denominación (cálculo en aplicación)
-- El procedimiento retorna los totales, el frontend calcula denominaciones
DELIMITER //
CREATE PROCEDURE sp_get_arqueo_breakdown(IN p_shift_id INT)
BEGIN
    -- Totales por método
    SELECT
        IFNULL(SUM(CASE WHEN method = 'efectivo' THEN amount ELSE 0 END), 0) AS cash_total,
        IFNULL(SUM(CASE WHEN method = 'tarjeta' THEN amount ELSE 0 END), 0) AS card_total,
        IFNULL(SUM(CASE WHEN method = 'qr' THEN amount ELSE 0 END), 0) AS qr_total
    FROM shift_transactions
    WHERE shift_id = p_shift_id AND type = 'sale';
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/shifts/open` | Abrir turno | Sí |
| `POST` | `/api/shifts/:id/close` | Cerrar turno | Sí |
| `GET` | `/api/shifts/current` | Turno actual abierto | Sí |
| `GET` | `/api/shifts/history` | Historial de turnos | Sí |
| `GET` | `/api/shifts/:id/arqueo` | Desglose para arqueo | Sí |
| `POST` | `/api/shifts/:id/transactions` | Registrar transacción | Sí |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   ├── CajaPage.jsx            # Dashboard de caja
│   ├── OpenShiftPage.jsx       # Abrir turno
│   ├── ArqueoPage.jsx          # Arqueo de caja
│   └── ShiftHistoryPage.jsx    # Historial
├── components/
│   ├── ShiftStatusCard.jsx     # Estado del turno
│   ├── KPI.jsx                 # Tarjeta KPI
│   ├── ArqueoForm.jsx          # Formulario denominaciones
│   ├── DenominationInput.jsx   # Input por denominación
│   └── ShiftHistoryTable.jsx   # Tabla historial
└── api/
    └── shifts.js
```

### Layout Arqueo:
```
┌─────────────────────────────────────┐
│  Arqueo de Caja - Turno #12        │
├─────────────────────────────────────┤
│  Efectivo esperado: Q1,250.00       │
├─────────────────────────────────────┤
│  Conteo de Denominaciones:          │
│  Q100 x [5] = Q500.00              │
│  Q50  x [3] = Q150.00              │
│  Q20  x [10]= Q200.00              │
│  Q10  x [15]= Q150.00              │
│  Q5   x [20]= Q100.00              │
│  Q1   x [50]= Q50.00               │
│  Q0.50x [20]= Q10.00               │
│  Q0.25x [40]= Q10.00               │
├─────────────────────────────────────┤
│  Total contado:  Q1,270.00          │
│  Diferencia:     +Q20.00 (Sobrante) │
├─────────────────────────────────────┤
│  [Cerrar Turno]                     │
└─────────────────────────────────────┘
```

---

## 5. Pruebas

### Jest:
```javascript
describe('Shift System', () => {
  test('abrir turno crea registro con start_cash')
  test('no se puede abrir turno si ya hay uno abierto')
  test('cerrar turno calcula difference correctamente')
  test('historial retorna turnos cerrados ordenados')
})
```

### Playwright:
```javascript
test('flujo de turno: abrir, operar, cerrar', async ({ page }) => {
  await page.goto('/#/caja/abrir')
  await page.fill('input[name="startCash"]', '200')
  await page.click('button:has-text("Abrir Turno")')
  await expect(page.locator('.shift-status')).toContainText('Abierto')
})
```

---

## 6. Criterios de Aceptación

- [x] Abrir turno guarda start_cash y hora
- [x] No se puede abrir turno si ya hay uno abierto en la estación
- [x] Cerrar turno calcula expected_cash y difference
- [x] Arqueo muestra desglose por denominación
- [x] Historial muestra turnos cerrados con totales
- [x] Transacciones se registran durante el turno
- [x] Sobrante/faltante se muestra claramente

---

## 7. Correcciones post-implementación

Durante las pruebas se detectaron y corrigieron tres problemas de esquema que
se arrastraban desde el diseño inicial (`01_create_tables.sql`):

### 7.1 Enum de método desalineado
`shift_transactions.method` quedó con el enum original en inglés
(`cash`,`card`,`qr`) mientras que `payments.method` usa el enum en español
(`efectivo`,`tarjeta`,`qr`). Cada intento de registrar una venta en el turno
fallaba con `Data truncated for column 'method'` — y como el enlace era
*best-effort* (en `paymentController`), el error se silenciaba y las ventas
nunca aparecían en Caja.

- **Migración:** `database/migrations/009_shift_method_enum.sql`
- **Causa raíz eliminada:** el enlace pago→turno ahora vive **dentro de
  `sp_record_payment`** (atómico), no en el controller.

### 7.2 Faltaban columnas de totales en `shifts`
La tabla `shifts` no tenía `total_sales`, `cash_sales`, `card_sales`,
`qr_sales` ni `transaction_count`, que `sp_close_shift` escribe al cerrar el
turno. Cerrar un turno devolvía 500:
`Unknown column 'total_sales' in 'field list'`.

- **Migración:** `database/migrations/010_shifts_totals_columns.sql`

### 7.3 Backfill de ventas históricas
Los pagos registrados durante un turno antes del arreglo no quedaron ligados.
Se agregó un script idempotente que los liga retroactivamente:

- **Migración:** `database/migrations/008_shift_backfill.sql`

### 7.4 UX del cierre
El error del cierre se mostraba **detrás** del `ArqueoModal`, por lo que un
fallo parecía "no hace nada". Ahora el `ArqueoModal` recibe y muestra la prop
`error`, y el modal siempre se puede descartar (X / Cancelar / fondo).

### 7.5 El cobro exige un turno de caja abierto
Antes se podía cobrar una orden pausada **sin haber abierto caja**, lo que
dejaba ventas fuera del turno (no aparecían en Caja).

- **Backend:** `sp_record_payment` valida al inicio que exista un turno
  `open`; si no, lanza `SIGNAL 45000` con el mensaje
  *"Debe abrir un turno de caja antes de cobrar"* (el controller lo traduce a
  HTTP 409). El enlace de la venta al turno pasó a ser obligatorio.
- **Frontend:** `PaymentView` exige `shift` en `canPay`, oculta los controles
  de pago y muestra un aviso con botón **Abrir Caja** cuando no hay turno.
