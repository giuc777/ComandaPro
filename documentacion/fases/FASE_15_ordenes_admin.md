# FASE 15 — Pantalla de Órdenes del Administrador (implementación)

**Estado:** 📋 Plan de implementación
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

---

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Ubicación | Ruta nueva **`/ordenes`**, visible solo para `Administrador` |
| Protección | Mismo patrón que `/usuarios`: `<ModuleRoute hasModule={() => user?.role === 'Administrador'} moduleKey="ordenes">` |
| Edición | **Completa**: mesa, cliente, modo, notas, cantidades, agregar/quitar ítems |
| Estados editables | Cualquiera **excepto** `pagada` y `anulada` (para cualquier otro estado hace falta ser Administrador) |
| Recálculo | Los totales los recalcula `sp_recalculate_order_totals` (IVA 12%) en el backend; el front solo muestra |
| Ítems enviados | Se pueden editar; los ítems nuevos quedan `sent=0` y aparecen como **NUEVO** en el KDS |
| Refresco | Polling **15 s** (misma cadencia que FASE 05) |
| Auditoría | Se agrega `updated_by` (ver A.3) para saber quién editó |

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

1. `updateOrder` revisa `affected === 0` → **409** *"Estado no editable"*.
2. Regla de permisos: Administrador siempre; rol con `pos` solo en `pausada`.
3. `apiClient` (`updateOrder`, `deleteOrderItem`, `addOrderItem`) revisa
   `response.ok` y propaga el error.
4. `updateOrder` persiste `updated_by = req.user.id`.

### B.3 `apiClient.js`

```js
getAdminOrders(status, limit)   // GET /admin/orders
getAdminOrder(id)               // GET /admin/orders/:id
```

---

## Sub-fase E — Frontend `/ordenes`

### E.1 Archivos

```
front-end/src/
├── pages/OrdenesPage.jsx                 # listado + filtros + acciones
├── components/orders/
│   ├── OrderList.jsx                     # tarjetas/filas
│   ├── OrderStatusBadge.jsx              # pill por estado (compartible con KDS)
│   └── OrderEditModal.jsx                # modal de edición completa
└── App.jsx                               # nueva ruta /ordenes
```

### E.2 Listado (`OrdenesPage.jsx`)
- **Filtros por estado** con conteo: `Todas` / `Pausadas` / `Enviadas` /
  `En Preparacion` / `Listas` / `Completadas` / `Pausadas` (borradores).
- Polling `setInterval(load, 15000)` limpiado al desmontar.
- Por tarjeta: `#id`, pill de estado, `Mesa N` o `Para Llevar`, `customer_name`,
  `N ítems`, `total` (Q), `timeAgo(created_at)`, `created_by_name`.
- **Acciones:**
  | Acción | Visible si | Endpoint |
  |--------|-----------|----------|
  | **Editar** | estado no sea `pagada`/`anulada` | abre `OrderEditModal` |
  | **Ver detalle** | siempre | `GET /admin/orders/:id` |
  | **Enviar a Cocina** | `pausada` | `POST /orders/:id/send` |
  | **Anular** | no `pagada`/`anulada` | `DELETE /orders/:id` con `confirm()` |
- Estado vacío: *"No hay ordenes en este filtro"*.

### E.3 Modal de edición (`OrderEditModal.jsx`)
**Cabecera:**
- `Mesa` (selector de mesas), `Cliente` (`customer_name`), `Modo` (mesa/llevar),
  `Notas`.

**Ítems** (fila por ítem):
- Nombre + modificadores, `unit_price`.
- Selector de cantidad (`1..N`) y botón **Quitar** (borrado real vía
  `sp_clear_order_items` + reinserta, o `DELETE /:items/:itemId`).
- Nota por ítem.

**Agregar ítem:**
- Buscador de productos (`GET /api/products`), selector de modificadores
  (`GET /api/products/:id/modifiers` — mismo componente `ModifierModal` del POS)
  y cantidad → `POST /api/orders/:id/items` (nace `sent=0`).

**Totales:** se recalculan en backend; el modal muestra `subtotal / tax / total`
devueltos por el `GET`.

**Guardar** → `PUT /api/orders/:id` con la cabecera + lista completa de ítems.
Manejo de errores: mostrar el `409` del backend (no silenciar).

### E.4 `App.jsx`
- Ruta `/ordenes` envuelta igual que `/usuarios` (líneas 145-153):
  `ProtectedRoute` → `ModuleRoute hasModule={() => user?.role === 'Administrador'}`.
- **Sidebar / MobileNav:** nuevo item `Ordenes` (`receipt_long`) con
  `admin: true` (mismo patrón del item *Usuarios*, `Sidebar.jsx:16-18`).

### Tareas
- [ ] `adminOrdersController` + `routes/adminOrders.js` + montaje en `index.js` con `adminOnly`
- [ ] Columna `updated_by` en la migración 018
- [ ] `OrdenesPage` + `OrderList` + `OrderStatusBadge`
- [ ] `OrderEditModal` (cabecera + ítems + agregar producto con modificadores)
- [ ] Ruta y navegación en `App.jsx`, `Sidebar.jsx`, `MobileNav.jsx`
- [ ] `apiClient`: `getAdminOrders`, `getAdminOrder` + manejo de errores

### Criterios de aceptación
- [ ] Un Barista/Cajero que escriba `/ordenes` es redirigido al dashboard
- [ ] El listado muestra órdenes en **todos** los estados activos (no solo `pausada`) y se refresca cada 15 s
- [ ] El admin puede cambiar la mesa/cliente/notas de una orden en `preparando` y guardar (200)
- [ ] El admin puede subir la cantidad de un ítem, quitarlo y agregar uno nuevo con modificadores
- [ ] Los totales se recalculan con IVA 12% tras guardar
- [ ] Un ítem agregado por el admin aparece en el KDS como **NUEVO**
- [ ] Editar una orden `pagada` devuelve **409** y el modal lo muestra
- [ ] El admin recibe **409** si intenta editar una orden que otro usuario cerró
- [ ] "Anular" con `confirm()` deja la orden en `anulada` y desaparece del listado activo

---

## Verificación

- [ ] `node --check` en los controllers/routers nuevos
- [ ] `pnpm build` + `pnpm exec oxlint` en `front-end` (sin errores nuevos)
- [ ] Revisión estática de SQL agregado (FKs, ASCII sin BOM)
- [ ] Prueba manual:
  1. Mesero pausa → envía; admin ve la orden en `/ordenes` con estado `enviada`
  2. Admin edita ítems mientras `preparando`; cocina ve el ítem **NUEVO**
  3. Cocina marca `lista` → admin la ve → la caja la cobra
  4. Orden `pagada` → botón Editar no disponible / 409
  5. Usuario no-admin en `/ordenes` → redirigido
- [ ] Pasar este documento y FASE 05 a **✅ Completada**

---

## Riesgos

| # | Riesgo | Mitigación |
|---|--------|------------|
| 1 | Editar ítems de una orden en cocina puede "engañar" al cocinero | El ítem nuevo queda `sent=0` y el KDS lo resalta como **NUEVO** |
| 2 | Reemplazar todos los ítems (`sp_clear_order_items` + reinserta) cambia los IDs | Aceptar: los ítems se reinsertan; verificar que no haya `order_items` referenciados por otra tabla (hoy no los hay) |
| 3 | `DELETE` de ítems no hace *soft-delete* | Registrado como pendiente de auditoría si el cliente lo pide |
| 4 | Si FASE 05 (A/B) no está aplicada, `/ordenes` no puede agrupar ítems | Dependencia estricta documentada en el encabezado |
