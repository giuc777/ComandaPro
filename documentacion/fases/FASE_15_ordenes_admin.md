# FASE 15 — Pantalla de Órdenes del Administrador (implementación)

**Estado:** 🟡 En implementación — sub-fases **A ✅ · B ✅ · E ✅** (2026-09-30)
**Dependencias:** FASE 04 (Órdenes POS), **[FASE 05 (KDS)](FASE_05_kds_cocina.md)** — reutiliza sus sub-fases A y B

---

## Objetivo

Dar al administrador una pantalla propia donde **vea todas las órdenes** (las
que hoy "no aparecen") y pueda **editarlas por completo** cuando sea necesario:
cabecera, cantidades, alta/baja de ítems y anulación, sin importar quién las
creó ni en qué etapa de cocina estén.

### Requerimientos (cliente)
1. El mesero envía la orden; **el administrador la puede ver** aunque esté en cocina.
2. El administrador **puede editarla** si es necesario (edición completa).
3. Acceso exclusivo del rol **Administrador**.

### Problema actual (por qué "no aparecen")
- `reportController.getDashboard` filtra **solo** `status='pausada'` con `LIMIT 10`.
- `Dashboard.jsx` carga **una sola vez** al montar (sin refresco).
- No existe ninguna pantalla de listado de órdenes: solo `ParkedOrdersPanel`
  (POS) y la tarjeta del Dashboard, **solo lectura**.
- `PUT /api/orders/:id` es `adminOnly` pero el controller **ignora `affected`**,
  y `apiClient.updateOrder` **no revisa `response.ok`** (errores silenciosos).

> Los puntos 3 y 4 ya están corregidos: hoy existe la pantalla `/ordenes`
> (sub-fase E), `updateOrder` valida estado/permisos con transacción (E.0) y
> `apiClient` propaga el error.

---

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Ubicación | Ruta nueva **`/ordenes`**, visible solo para `Administrador` |
| Protección | Mismo patrón que `/usuarios`: `<ModuleRoute hasModule={() => user?.role === 'Administrador'} moduleKey="ordenes">` |
| Edición | **Completa**: mesa, cliente, modo, notas, cantidades, alta/baja de ítems |
| Estados editables | **Cabecera** (mesa/cliente/modo/notas): cualquier rol con módulo `pos` en cualquier estado no pagado (regla de la sub-fase H). **Reemplazo de `items`**: solo Administrador, o cualquier rol si la orden está `pausada`. `pagada`/`anulada` → **409** siempre |
| Sincronización de ítems | **Reconciliación por `item_id`**: conserva `sent`/`sent_at`/`prepared_at` de los existentes; sin `item_id` → INSERT con `sent=0`; ids ausentes del payload → `DELETE` |
| Recálculo | Los totales los recalcula `sp_recalculate_order_totals` (IVA 12%) en el backend; el front solo muestra |
| Ítems enviados | Se pueden editar; los ítems nuevos quedan `sent=0` y aparecen como **NUEVO** en el KDS |
| Filtros del listado | Estados activos + `completada` (**sin filtro "Pagadas"**: solo la caja cobra) |
| Refresco | Polling **15 s** (misma cadencia que FASE 05) |
| Auditoría | Se agrega `updated_by` (ver A.3) para saber quién editó |

> **Decisión de permisos (2026-09-30):** la regla original de esta fase (*"cualquier
> estado activo exige Administrador"*) chocaba con la sub-fase H, que dejó verificado
> que un Cajero puede editar la cabecera de una orden `enviada`
> (`test_d` D12 y `test_h` H12 esperan 200). Se **conserva el comportamiento de H**:
> el límite de Administrador aplica al **reemplazo de ítems** (409
> *"Solo se pueden reemplazar los items de una orden pausada"*), no a la cabecera.

---

## Sub-fases

| Sub-fase | Contenido | Estado |
|----------|-----------|--------|
| A | Compartida con FASE 05 (datos) | ✅ 2026-09-28 |
| B | Compartida con FASE 05 (backend + `adminOrdersController`) | ✅ 2026-09-28 |
| E.0 | Backend de edición (reconciliación de ítems + permisos) | ✅ 2026-09-30 |
| E | Frontend `/ordenes` | ✅ 2026-09-30 |

---

## Sub-fase A — Compartida con FASE 05 (datos) ✅ (2026-09-28)

Se reutiliza todo lo definido en FASE 05 sub-fase A:

- Migración `018_kds_cocina.sql` (columnas de cocina, `updated_by` e ítems).
- `sp_get_orders_admin(IN p_status VARCHAR(20), IN p_limit INT)` — listado para
  esta pantalla (estados activos + `completada`, con totales).
- `sp_reopen_order` con guard relajado a `status NOT IN ('pagada','anulada')`.
- `sp_get_order` exponiendo `sent`/`prepared_at` y las marcas de tiempo.

### A.3 Adicional de esta fase

```sql
-- auditoría de edición (migración 018)
ALTER TABLE `orders`
    ADD COLUMN IF NOT EXISTS `updated_by` INT NULL AFTER `voided_by`;
-- (FK a users con ON DELETE SET NULL, opcional)
```

---

## Sub-fase B — Compartida con FASE 05 (backend)

| Método | Ruta | Handler | Auth |
|--------|------|---------|------|
| `GET` | `/api/admin/orders?status=&limit=` | `adminOrdersController.list` | `authenticate` + **`adminOnly`** |
| `GET` | `/api/admin/orders/:id` | `adminOrdersController.get` | `adminOnly` |
| `PUT` | `/api/orders/:id` (ya existe) | `orderController.updateOrder` | admin siempre; otros roles solo si `status='pausada'` |
| `DELETE` | `/api/orders/:id` (ya existe) | `orderController.voidOrder` | `adminOnly` |
| `POST` | `/api/orders/:id/items` (ya existe) | `orderController.addOrderItem` | admin o `status='pausada'` |

### B.1 `adminOrdersController` (nuevo)

```js
list  → CALL sp_get_orders_admin(?, ?)   // agrupa ítems por order_id
get   → CALL sp_get_order(?)             // cabecera + ítems
```

### B.2 Correcciones heredadas de FASE 05 B.3

1. `updateOrder` valida el estado editable con `SELECT ... FOR UPDATE` → **409**
   *"Estado no editable"* (no se usa `affected === 0`: `sp_reopen_order` devuelve
   `ROW_COUNT() = 0` cuando la cabecera no cambia y daría falsos positivos).
2. Regla de permisos de `PUT /api/orders/:id`: la **cabecera** (sin `items`) es
   editable por cualquier rol con módulo `pos` en cualquier estado no pagado
   (sub-fase H); el **reemplazo de `items`** solo lo hace Administrador o
   cualquier rol si `status='pausada'` → **409** *"Solo se pueden reemplazar
   los items de una orden pausada"*. La misma regla se revalida dentro de la
   transacción contra el estado leído con `FOR UPDATE`.
3. `apiClient` (`updateOrder`, `deleteOrderItem`, `addOrderItem`) revisa
   `response.ok` y propaga el error.
4. `updateOrder` persiste `updated_by = req.user.id`.

### B.3 `apiClient.js`

```js
getAdminOrders(status, limit)   // GET /admin/orders
getAdminOrder(id)               // GET /admin/orders/:id
```

---

## Sub-fase E.0 — Backend de edición ✅ (2026-09-30)

`back-end/src/controllers/orderController.js`:

- **Validaciones** del `PUT /api/orders/:id`: 400 si un ítem no tiene
  `product_id`/`unit_price`/`quantity` válidos; **404** si la orden no existe;
  **409** si está `pagada` o `anulada`.
- **Permisos** (decisión 2026-09-30, ver nota de la tabla de decisiones):
  - cabecera sin `items` → cualquier rol con módulo `pos`, en cualquier estado
    no pagado (regla H);
  - payload con `items` y `role !== 'Administrador'` → **409** *"Solo se pueden
    reemplazar los items de una orden pausada"* si `status !== 'pausada'`;
  - la misma regla se revalida dentro de la transacción sobre el estado leído
    con `FOR UPDATE` (cubre el caso de que otra caja cierre la orden a la vez).
- **Transacción**: `SELECT ... FOR UPDATE` de la orden (409 si el estado no es
  editable) → `sp_reopen_order` (si aplica) → `updated_by` →
  `reconcileOrderItems` → `sp_recalculate_order_totals`.
- **`reconcileOrderItems`** (reconciliación por `item_id`):
  | Caso | Acción |
  |------|--------|
  | `item_id` existe en la orden | `UPDATE` de `quantity`, `unit_price`, `modifiers`, `modifier_labels`, `notes` — **conserva `sent`, `sent_at` y `prepared_at`** |
  | Sin `item_id` | `INSERT` con `sent = 0` (aparece como **NUEVO** en el KDS) |
  | `item_id` del orden que no viene en el payload | `DELETE` |
- `toDbModifiers` (string JSON pasa tal cual, array → `JSON.stringify`) y
  `toDbLabels` (array → `join(', ')`).
- `PUT` con cabecera sola (sin `items`) **no** toca los ítems.

---

## Sub-fase E — Frontend `/ordenes` ✅ (2026-09-30)

### E.1 Archivos

```
front-end/src/
├── pages/OrdenesPage.jsx                 # listado + filtros + acciones + modales
├── components/orders/
│   ├── OrderList.jsx                     # tarjetas (fila por orden)
│   ├── OrderStatusBadge.jsx              # pill por estado (compartido con KDS)
│   └── OrderEditModal.jsx                # modal de edición completa
├── App.jsx                               # nueva ruta /ordenes
├── components/Sidebar.jsx                # item admin "Ordenes"
└── components/MobileNav.jsx              # item admin "Ordenes"
```

### E.2 Listado (`OrdenesPage.jsx`)
- **Filtros por estado** con conteo en cliente: `Todas` / `Pausadas` / `Enviadas` /
  `En Preparacion` / `Listas` / `Completadas` (sin filtro "Pagadas": la lista
  usa `sp_get_orders_admin`, que solo devuelve estados activos + `completada`).
- Polling `setInterval(load, 15000)` limpiado al desmontar; banner de error con
  botón de descarte (no silencia los 409/403).
- Por tarjeta (`OrderList.jsx`): `#id`, pill de estado, `Mesa N` o `Para Llevar`,
  `customer_name`, ítems, `total` (Q), `timeAgo(created_at)` y `created_by_name`.
- **Acciones:**
  | Acción | Visible si | Endpoint |
  |--------|-----------|----------|
  | **Editar** | siempre (el modal queda en solo lectura si está `pagada`/`anulada`) | `GET /admin/orders/:id` → `OrderEditModal` |
  | **Ver detalle** | siempre | `GET /admin/orders/:id` → `OrderEditModal` (solo lectura si `pagada`/`anulada`) |
  | **Enviar a Cocina** | `pausada` | `POST /orders/:id/send` |
  | **Anular** | no `pagada`/`anulada` | `DELETE /orders/:id` con `useConfirm()` |
- El detalle abre siempre desde `GET /admin/orders/:id` porque el listado no
  trae `table_id` ni `modifiers`.
- Estado vacío: *"No hay ordenes en este filtro"*.
- `data-testid`: `ordenes-page`, `ordenes-filter-<estado>`, `order-card-<id>`,
  `edit-order-<id>`, `detail-order-<id>`, `send-order-<id>`, `void-order-<id>`.

### E.3 Modal de edición (`OrderEditModal.jsx`)
**Cabecera:**
- `TableSelector` (solo en modo `mesa`), `CustomerNameInput`, `OrderModeToggle`
  y `textarea` de notas; en solo lectura se muestran como texto.

**Ítems** (fila por ítem): nombre + `modifier_labels` + chip **Enviado/Nuevo**,
`unit_price` por unidad, selector de cantidad (`1..20`), nota por ítem y botón
**Quitar** (el backend lo borra por reconciliación).

**Agregar ítem:** botón *"Agregar producto"* que muestra `ProductosPos`
(mismo buscador/categorías/modificadores del POS: `ModifierModal` al confirmar)
y agrega el producto al estado local con `item_id = null` → al guardar nace
`sent = 0` en el KDS.

**Totales:** `subtotal / tax 12% / total` calculados en el modal como vista
previa; los definitivos los recalcula `sp_recalculate_order_totals`.

**Guardar** → `PUT /api/orders/:id` con cabecera + lista completa de ítems
(`item_id` solo si existe). Manejo de errores: el mensaje del backend (409/403/400)
se muestra en un banner dentro del modal (`data-testid="order-edit-error"`).
`modifiers` se reenvía tal cual (array nuevo o string existente) y el backend lo
normaliza.

### E.4 Navegación
- `App.jsx`: ruta `/ordenes` envuelta igual que `/usuarios`:
  `ProtectedRoute` → `ModuleRoute hasModule={() => user?.role === 'Administrador'} moduleKey="ordenes"`.
- `Sidebar.jsx`: `adminItems` con `{ to: '/ordenes', icon: 'receipt_long', label: 'Ordenes' }`.
- `MobileNav.jsx`: se inserta en `splice(6, 0, …)` junto con *Usuarios* (sin
  mover el índice de *Ajustes*).

### Tareas — sub-fase B ✅ (2026-09-28); sub-fase E ✅ (2026-09-30)
- [x] `adminOrdersController` + `routes/adminOrders.js` + montaje en `index.js` con `adminOnly`
- [x] Columna `updated_by` en la migración 018 (se persiste en cada edición)
- [x] E.0 backend: reconciliación de ítems por `item_id` + 403/404/409 + `FOR UPDATE`
- [x] `OrdenesPage` + `OrderList` + `OrderStatusBadge`
- [x] `OrderEditModal` (cabecera + ítems + agregar producto con modificadores)
- [x] Ruta y navegación en `App.jsx`, `Sidebar.jsx`, `MobileNav.jsx`
- [x] `apiClient`: `getAdminOrders`, `getAdminOrder` + manejo de errores
- [x] `useOrder.toPayload` envía `item_id` para los ítems existentes

### Criterios de aceptación
- [ ] Un Barista/Cajero que escriba `/ordenes` es redirigido al dashboard (verificación en navegador pendiente)
- [x] El listado muestra órdenes en **todos** los estados activos (no solo `pausada`) y se refresca cada 15 s *(API `sp_get_orders_admin` con estados mixtos + polling en `OrdenesPage`)*
- [x] El admin puede cambiar la mesa/cliente/notas de una orden en `preparando` y guardar (200) *(test_e E8)*
- [x] El admin puede subir la cantidad de un ítem, quitarlo y agregar uno nuevo con modificadores *(test_e + test_e_modal M3–M8)*
- [x] Los totales se recalculan con IVA 12% tras guardar *(test_e, test_e_modal M11)*
- [x] Un ítem agregado por el admin aparece en el KDS como **NUEVO** *(test_e_modal M8/M13: `sent=0` y oculto en KDS)*
- [x] Editar una orden `pagada` devuelve **409** y el modal lo muestra *(test_e E15; banner `order-edit-error`)*
- [x] El admin recibe **409** si intenta editar una orden que ya no es editable (otro usuario la cobró/anuló) *(test_e E14/E15; guard con `SELECT ... FOR UPDATE`)*
- [x] "Anular" con confirmación deja la orden en `anulada` y desaparece del listado activo *(test_e E13/E14 + `useConfirm`)*
- [x] Un no-admin **sí** puede editar la cabecera de una orden activa (200, regla H) *(test_e E6, test_d D12, test_h H12)*
- [x] Un no-admin **no** puede reemplazar los ítems de una orden activa → **409** *"Solo se pueden reemplazar los items de una orden pausada"*; en `pausada` → 200 *(test_e E6b/E12, test_h H13)*
- [x] Un no-admin en `/admin/orders` → **403** *(test_e E2)*

---

## Verificación

- [x] `node --check` en los controllers/routers (35 archivos)
- [x] `pnpm build` + `pnpm exec oxlint` en `front-end` (sin errores nuevos)
- [x] Revisión estática de SQL agregado (sin BOM, sin contenido no-ASCII nuevo,
      `DELIMITER` balanceados, sin `DROP TABLE`/`DELETE`/`TRUNCATE`)
- [x] Render SSR de `OrdenesPage` / `OrderList` / `OrderEditModal` (editable y
      solo lectura) → **8/8**
- [x] `test_e.ps1` contra el backend local → **21/21** (permisos, 409/400,
      reconciliación, IVA 12%, KDS con `sent=0`, anulación)
- [x] `test_e_modal.ps1` (payload idéntico al del `OrderEditModal`) → **17/17**
- [x] Regresiones tras el ajuste de permisos: `test_d` **18/18**, `test_h`
      **26/26**, `test_f` **15/15**, `test_f1_api` **13/13**
- [x] BD verificada sin restos de pruebas (solo órdenes reales; 0 ítems/pagos
      huérfanos)
- [ ] Prueba manual en navegador (la realiza el cliente):
  1. Mesero pausa → envía; admin ve la orden en `/ordenes` con estado `enviada`
  2. Admin edita ítems mientras `preparando`; cocina ve el ítem **NUEVO**
  3. Cocina marca `lista` → admin la ve → la caja la cobra
  4. Orden `pagada` → botón Editar en solo lectura / 409 ✅ (API)
  5. Usuario no-admin en `/ordenes` → redirigido ✅ (`adminOnly` → 403 en API)
- [ ] Pasar este documento y FASE 05 a **✅ Completada** (tras G)

---

## Riesgos

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Editar ítems de una orden en cocina puede "engañar" al cocinero | El ítem nuevo queda `sent=0` y el KDS lo resalta como **NUEVO** |
| 2 | Reemplazar los ítems cambiaría los `id` y perdería el estado de envío | Reconciliación por `item_id`: conserva `id`, `sent`, `sent_at` y `prepared_at`; los nuevos nacen `sent=0` |
| 3 | `DELETE` de ítems no hace *soft-delete* | Registrado como pendiente de auditoría si el cliente lo pide |
| 4 | Si FASE 05 (A/B) no está aplicada, `/ordenes` no puede agrupar ítems | Dependencia estricta documentada en el encabezado |
