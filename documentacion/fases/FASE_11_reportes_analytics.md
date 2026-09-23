# Fase 11: Reportes y Analíticas

> ## ✅ ESTADO: IMPLEMENTADA
>
> Módulo completo de reportes y dashboard con datos reales. Ver notas de
> implementación al final por diferencias con el esquema original del documento.

## Objetivo
Implementar el módulo de reportes con dashboards, análisis de ventas, y reportes de cierre de caja.

---

## 1. Vistas SQL

```sql
-- ============================================
-- FASE 11: Vistas de Reportes
-- ============================================

-- Resumen diario de ventas
CREATE OR REPLACE VIEW v_daily_sales_summary AS
SELECT
    DATE(created_at) AS sale_date,
    COUNT(*) AS total_transactions,
    IFNULL(SUM(grand_total), 0) AS total_sales,
    IFNULL(SUM(CASE WHEN method = 'efectivo' THEN grand_total ELSE 0 END), 0) AS cash_sales,
    IFNULL(SUM(CASE WHEN method = 'tarjeta' THEN grand_total ELSE 0 END), 0) AS card_sales,
    IFNULL(SUM(CASE WHEN method = 'qr' THEN grand_total ELSE 0 END), 0) AS qr_sales,
    IFNULL(AVG(grand_total), 0) AS avg_ticket
FROM payments
GROUP BY DATE(created_at);

-- Ranking de productos más vendidos
CREATE OR REPLACE VIEW v_product_ranking AS
SELECT
    p.id AS product_id,
    p.name AS product_name,
    c.name AS category_name,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'paid'
GROUP BY p.id, p.name, c.name
ORDER BY total_sold DESC;

-- Ventas por hora
CREATE OR REPLACE VIEW v_hourly_sales AS
SELECT
    HOUR(created_at) AS sale_hour,
    COUNT(*) AS transaction_count,
    IFNULL(SUM(grand_total), 0) AS total_sales
FROM payments
GROUP BY HOUR(created_at)
ORDER BY sale_hour;

-- Ventas por categoría
CREATE OR REPLACE VIEW v_category_sales AS
SELECT
    c.id AS category_id,
    c.name AS category_name,
    SUM(oi.quantity) AS items_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    COUNT(DISTINCT oi.order_id) AS order_count
FROM order_items oi
JOIN products p ON oi.product_id = p.id
JOIN categories c ON p.category_id = c.id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'paid'
GROUP BY c.id, c.name
ORDER BY total_revenue DESC;
```

---

## 2. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/reports/daily` | Resumen del día (?date=) | Admin |
| `GET` | `/api/reports/products/ranking` | Ranking productos | Admin |
| `GET` | `/api/reports/hourly` | Ventas por hora | Admin |
| `GET` | `/api/reports/categories` | Ventas por categoría | Admin |
| `GET` | `/api/reports/cash-closing` | Reporte de cierre (?shiftId=) | Admin |
| `GET` | `/api/reports/period` | Comparativa de periodos | Admin |

---

## 3. Componentes React

```
front-end/src/
├── pages/
│   ├── ReportsPage.jsx          # Hub de reportes
│   ├── DailyReportPage.jsx      # Reporte diario
│   ├── AnalyticsPage.jsx        # Analíticas con gráficas
│   └── CashClosingPage.jsx      # Cierre de caja
├── components/
│   ├── SalesChart.jsx           # Gráfica de ventas
│   ├── ProductRankingTable.jsx  # Tabla ranking
│   ├── HourlyChart.jsx          # Gráfica por hora
│   ├── CategoryChart.jsx        # Gráfica por categoría
│   └── PeriodComparison.jsx     # Comparativa periodos
└── api/
    └── reports.js
```

### Dependencia de gráficas:
```bash
pnpm add recharts
```

### Layout Dashboard:
```
┌─────────────────────────────────────┐
│  Resumen del Día - 14 Sep 2026      │
├──────────┬──────────┬──────────┬────┤
│ Ventas   │ Efectivo │ Tarjeta  │ QR │
│ Q2,450   │ Q1,200   │ Q950     │Q300│
├──────────┴──────────┴──────────┴────┤
│  Gráfica de Ventas por Hora         │
│  ┌─────────────────────────────┐   │
│  │    ╭──╮                     │   │
│  │   ╭╯  ╰╮    ╭──╮           │   │
│  │──╯    ╰──╯    ╰──          │   │
│  └─────────────────────────────┘   │
├─────────────────────────────────────┤
│  Ranking de Productos               │
│  1. Latte Vainilla    45 units     │
│  2. Cold Brew Nitro   32 units     │
│  3. Capuchino Clásico 28 units     │
└─────────────────────────────────────┘
```

---

## 4. Pruebas

### Jest:
```javascript
describe('Reports System', () => {
  test('resumen diario retorna totales correctos')
  test('ranking ordena por más vendidos')
  test('ventas por hora agrupa correctamente')
  test('comparativa periodos calcula variación porcentual')
})
```

### Playwright:
```javascript
test('dashboard muestra KPIs del día', async ({ page }) => {
  await page.goto('/#/reportes/analytics')
  await expect(page.locator('.kpi-sales')).toBeVisible()
  await expect(page.locator('.sales-chart')).toBeVisible()
})
```

---

## 5. Criterios de Aceptación

- [x] Dashboard muestra ventas totales, por método, y transacciones
- [x] Gráfica de ventas por hora muestra tendencia
- [x] Ranking muestra top 10 productos más vendidos
- [x] Ventas por categoría muestra distribución
- [x] Reporte de cierre de caja muestra totales del turno
- [x] Comparativa de periodos muestra hoy vs ayer / semana vs semana
- [x] Solo admin puede acceder a reportes

---

## 6. Implementación (notas reales)

El esquema real difiere del borrador original de este documento. La
implementación usa:

| Borrador original | Implementación real |
|-------------------|---------------------|
| `payments.grand_total` | `payments.amount` |
| Tabla `categories` | `catalog_items` (grupo `categorias_producto`, vía `products.category_id`) |
| `order.status = 'paid'` | `order.status = 'pagada'` |
| Vistas SQL | Procedimientos almacenados |

### Stored Procedures (`database/procedures/011_report_procedures.sql`)

- `sp_get_sales_summary_range(start, end)`
- `sp_get_product_ranking(start, end, limit)`
- `sp_get_hourly_sales(date)`
- `sp_get_category_sales(start, end)`
- `sp_get_sales_trend(start, end)`
- `sp_get_period_comparison(date)`
- `sp_get_dashboard_summary()`
- `sp_get_cash_closing(shift_id)`

### Endpoints (`back-end/src/routes/reports.js`)

| Método | Ruta | Auth |
|--------|------|------|
| `GET` | `/api/reports/dashboard` | Autenticado |
| `GET` | `/api/reports/daily` | Admin |
| `GET` | `/api/reports/products/ranking` | Admin |
| `GET` | `/api/reports/hourly` | Admin |
| `GET` | `/api/reports/categories` | Admin |
| `GET` | `/api/reports/trend` | Admin |
| `GET` | `/api/reports/period` | Admin |
| `GET` | `/api/reports/cash-closing` | Admin |

> `/dashboard` es accesible a cualquier usuario autenticado (es la pantalla de
> inicio); el resto de reportes son solo para `Administrador`.

### Frontend

- `pages/ReportesPage.jsx` — dashboard de reportes con tabs de rango
  (Hoy / Ayer / Semana / Mes), KPIs, comparativa, tendencia, hora, categoría y ranking.
- `pages/Dashboard.jsx` — reescrito con datos reales (`/reports/dashboard`).
- `components/reports/` — `KpiCard`, `HourlyChart`, `CategoryChart`,
  `ProductRankingTable`, `PeriodComparison`, `SalesTrendChart`.
- `components/AdminRoute.jsx` — guard de ruta solo admin.
- Gráficas con `recharts`.

