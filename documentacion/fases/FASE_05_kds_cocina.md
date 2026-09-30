# FASE 05 — Kitchen Display System (KDS) (implementación)

**Estado:** 🟡 En implementación — A-D + H + F.3 ✅ · **E ✅ (2026-09-30, en FASE 15)** · F.1/F.2 y G pendientes
**Dependencias:** FASE 04 (Órdenes POS), FASE 06 (Pagos y Recibos)
**Fase complementaria:** [FASE 15 — Pantalla de Órdenes del Administrador](FASE_15_ordenes_admin.md)

---

## Objetivo

Implementar el módulo de cocina real: el mesero **envía** la orden desde el POS,
la cocina la gestiona (Preparar → Listo → Entregar), el administrador **ve y
edita** cualquier orden (FASE 15) y el cobro se habilita solo cuando la orden
está **lista o completada**.

> Esta fase **sustituye el alcance anterior** ("KDS fuera de alcance, solo
> pausado"). La especificación técnica previa de este documento se conserva y
> se ajusta al diseño aprobado.

### Requerimientos (cliente)
1. Módulo de cocina **parecido al del prototipo** (`../prototipo/js/screens/kds-mobile.js`).
2. El mesero **envía** la orden a cocina.
3. El mesero también puede **pausar** la orden (la pausa actual de borradores en POS).
4. El administrador debe **ver** las órdenes — hoy no aparecen en su pantalla — y **editarlas** si es necesario (FASE 15).
5. La orden debe **fluir por cocina** antes de poder cobrarse.

---

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Estados de cocina | Se reutilizan los 4 valores que ya existen en el ENUM: `enviada`, `preparando`, `lista`, `completada` |
| Pausa | **Solo** la pausa de borradores en POS (`status='pausada'`). **No** se crea estado de pausa de cocina |
| Cobro | **Solo** desde `lista` o `completada` → todo borrador debe pasar por cocina antes de cobrar |
| Temporizador KDS | Cuenta desde `sent_at` (entrada a cocina), no desde `created_at` |
| Retraso | Alerta visual a los **15 min** sin estar en `lista` (igual que el prototipo) |
| Envío | **Parcial por ítem** (`order_items.sent`): los ítems nuevos de una orden ya enviada aparecen marcados **NUEVO** |
| Refresco | **Polling 10-15 s** (`setInterval`, patrón de `CajaPage.jsx`). Sin websockets |
| UI | Réplica del prototipo: chips con conteo, tarjetas, vista columnas ↔ grid, reloj |
| Roles | Sin roles nuevos. Cocina = módulo `kds` (ya sembrado: Administrador y Barista, no Cajero) |
| Permisos | Transiciones de estado → módulo `kds`; envío desde POS → módulo `pos`; edición/anulación → ver sub-fase B |

---

## Máquina de estados

```
                    ┌────────────────────────────────────────────┐
   POS (mesero)     │                                            ▼
  pausada ──Enviar──▶ enviada ──Preparar──▶ preparando ──Listo──▶ lista
     ▲               (mesero)      (cocina)      (cocina)
     │                                                │
     │                                        Entregar│
     │                                                ▼
     │                                          completada
     │                                                │
     └──────────────── (editar mientras activa) ──────┤
                                                      ▼
                              lista | completada ──Cobrar──▶ pagada

  anulada ◀──Anular── cualquier estado que NO sea pagada ni anulada
```

| Desde | Hacia | Acción | Quién | Módulo | SP |
|-------|-------|--------|-------|--------|-----|
| `pausada` | `enviada` | Enviar a Cocina | Mesero | `pos` | `sp_send_to_kitchen` |
| `enviada` | `preparando` | Preparar | Cocina | `kds` | `sp_update_order_status` |
| `preparando` | `lista` | Listo | Cocina | `kds` | `sp_update_order_status` |
| `lista` | `completada` | Entregar | Cocina | `kds` | `sp_update_order_status` |
| `lista` / `completada` | `pagada` | Cobrar | Cajero | `caja` | `sp_record_payment` |
| activa | `anulada` | Anular | Admin / KDS | `adminOnly` / `kds` | `sp_void_order` |

Cualquier transición no listada → `SIGNAL SQLSTATE '45000'` (el controller responde **409**).

---

## Sub-fases

Orden de ejecución: **A → B → {C, D, E} → F → G**.
Las sub-fases C, D, F son de esta fase; **E es FASE 15**.

| Sub-fase | Contenido | Estado |
|----------|-----------|--------|
| A | Datos y procedimientos almacenados | ✅ 2026-09-28 |
| B | Backend (endpoints y permisos) | ✅ 2026-09-28 |
| C | Pantalla de Cocina (KDS) | ✅ 2026-09-28 |
| D | POS: enviar a cocina | ✅ 2026-09-29 |
| E | Pantalla de órdenes del admin (FASE 15) | ✅ 2026-09-30 |
| F | Dashboard y Caja | 🟡 Parcial (F.3 ✅ 2026-09-29) |
| G | Verificación y documentación | ⬜ Pendiente |
| H | Agregar ítems a ordenes en curso (POS) | ✅ 2026-09-29 |

---

## Sub-fase A — Datos y procedimientos almacenados

**Objetivo:** esquema con tiempos de cocina + máquina de estados en SP.

### A.1 Columnas nuevas (migración)

```sql
-- database/migrations/018_kds_cocina.sql  (idempotente: IF NOT EXISTS)
ALTER TABLE `orders`
    ADD COLUMN IF NOT EXISTS `sent_at`     TIMESTAMP NULL AFTER `parked_at`,
    ADD COLUMN IF NOT EXISTS `started_at`  TIMESTAMP NULL AFTER `sent_at`,
    ADD COLUMN IF NOT EXISTS `ready_at`    TIMESTAMP NULL AFTER `started_at`,
    ADD COLUMN IF NOT EXISTS `completed_at` TIMESTAMP NULL AFTER `ready_at`;

CREATE INDEX IF NOT EXISTS `idx_orders_kds` ON `orders`(`status`, `sent_at`);

ALTER TABLE `order_items`
    ADD COLUMN IF NOT EXISTS `sent`        TINYINT(1) NOT NULL DEFAULT 0 AFTER `notes`,
    ADD COLUMN IF NOT EXISTS `sent_at`     TIMESTAMP NULL AFTER `sent`,
    ADD COLUMN IF NOT EXISTS `prepared_at` TIMESTAMP NULL AFTER `sent_at`;
```

> El ENUM `orders.status` **no cambia**: ya trae `enviada, preparando, lista,
> completada, pausada, pagada, anulada` (FASE 04).

### A.2 SP nuevos

| SP | Firma | Lógica |
|----|-------|--------|
| `sp_send_to_kitchen` | `(IN p_order_id INT)` | `SIGNAL` si `status <> 'pausada'` o si la orden no tiene ítems; `UPDATE order_items SET sent=1, sent_at=NOW() WHERE order_id=? AND sent=0`; `UPDATE orders SET status='enviada', sent_at=NOW()`; `SELECT id, status` |
| `sp_update_order_status` | `(IN p_order_id INT, IN p_status ENUM('enviada','preparando','lista','completada'))` | Valida la transición permitida (tabla anterior). En `preparando` marca `started_at`; en `lista` marca `ready_at` **y** `prepared_at` de los ítems sin preparar; en `completada` marca `completed_at`. `SIGNAL` si el estado actual no permite el cambio. `pausada → enviada` **no** está acá: la hace `sp_send_to_kitchen` |
| `sp_get_kds_orders` | `(IN p_status VARCHAR(20))` | Una sola consulta **plana** (fila por ítem) de `status IN ('enviada','preparando','lista')` — filtro opcional `p_status` — con `TIMESTAMPDIFF(MINUTE, sent_at, NOW()) AS minutes_waiting`, `table_name`, `customer_name`, `mode`, `created_by_name`, ítem (`product_name`, `quantity`, `modifier_labels`, `notes`, `prepared_at`). `ORDER BY sent_at ASC, oi.id` |
| `sp_get_orders_admin` | `(IN p_status VARCHAR(20), IN p_limit INT)` | Igual que el anterior pero incluye `pausada` y `completada`, `subtotal/tax/total`, `created_at`; usado por FASE 15 |

> Las filas planas se agrupan por `order_id` en el controller → **1 consulta**
> para toda la cocina (evita N+1).

> **Notas de implementación (2026-09-28):**
> - `prepared_at` se marca al pasar a **`lista`** (y no en `preparando`): a nivel
>   semántico el ítem queda "preparado" cuando termina, no cuando empieza. Solo
>   se tocan los ítems con `prepared_at IS NULL`.
> - `sp_send_to_kitchen` además valida que la orden tenga ítems, para que
>   ninguna orden quede invisible en el KDS.
> - `sp_get_order` expone también las 4 marcas de tiempo de la cabecera
>   (`sent_at`, `started_at`, `ready_at`, `completed_at`) y `updated_by`
>   (requerido por FASE 15).

### A.3 SP existentes a corregir (punto crítico)

| SP | Problema actual | Cambio |
|----|-----------------|--------|
| `sp_record_payment` | `IF v_status <> 'pausada'` → **bloquearía el cobro** | `IF v_status NOT IN ('lista','completada')` → mensaje *"Solo se pueden cobrar ordenes listas o completadas"* |
| `sp_reopen_order` | `WHERE ... AND status='pausada'` → el admin no podría editar | `AND status NOT IN ('pagada','anulada')`; el controller ahora **revisa `affected`** (sub-fase B) |
| `sp_add_order_item` | No valida estado | `SIGNAL` si `status IN ('pagada','anulada')`; los ítems nuevos nacen con `sent=0` |
| `sp_get_dashboard_summary` | `pending_orders` cuenta solo `pausada` | `status IN ('pausada','enviada','preparando','lista')` |
| `sp_get_order` | Los ítems no traen `sent` | Agregar `oi.sent, oi.sent_at, oi.prepared_at` al segundo result set (lo necesita el ticket del POS) |
| `sp_list_parked_orders` / `sp_list_orders_by_status` | — | Sin cambios (el ENUM ya acepta los estados) |

### A.4 Duplicación de fuentes de verdad

Cada cambio se aplica en **ambos** destinos:
1. `database/migrations/018_kds_cocina.sql` + `database/procedures/*.sql` → entornos nuevos/dev.
2. `Deploy/Produccion/migrations/018_kds_cocina.sql` + `Deploy/Produccion/sp_lectura.sql`, `sp_transaccionales.sql`, `sp_simple.sql` → producción (y lo mismo en `Deploy/Test/`).

### Tareas — ✅ Sub-fase A completada (2026-09-28)
- [x] `018_kds_cocina.sql` (migración idempotente: columnas + índice) — `database/migrations/` y `Deploy/Produccion/migrations/`
- [x] SPs nuevos (4) en `sp_transaccionales.sql` / `sp_lectura.sql`
- [x] Correcciones de los 6 SP existentes (A.3)
- [x] Espejo en `database/procedures/` (006, 007, 011) y `Deploy/Test/`
- [x] `Deploy/{Produccion,Test}/schema.sql` actualizado (instalaciones nuevas)
- [x] Revisión estática: firmas, `SIGNAL`, FKs, ASCII sin BOM, `DELIMITER` balanceados

> **Ejecutado (2026-09-28):** `018_kds_cocina.sql` corrió **dos veces** contra
> `comandapro` sin errores (2.ª pasada = idempotente, 0 filas nuevas). Falta correrlo
> contra `DeerCoffeeDB` en el despliegue a producción.

### Criterios de aceptación
- [x] Las 7 columnas nuevas existen con índice `idx_orders_kds`
- [x] `sp_update_order_status` rechaza `pausada → preparando` y `lista → preparando`
- [x] `sp_send_to_kitchen` solo acepta órdenes `pausada` y deja `sent=1` solo a los ítems nuevos
- [x] `sp_record_payment` rechaza `enviada`/`preparando` y acepta `lista`/`completada`
- [x] El archivo compila idempotente (re-ejecutarlo no falla) — verificado en `comandapro`

---

## Sub-fase B — Backend (endpoints y permisos)

**Objetivo:** transiciones de estado, lectura de cocina y arreglo de permisos.

### B.1 Endpoints nuevos

| Método | Ruta | Handler | Auth / permiso |
|--------|------|---------|----------------|
| `POST` | `/api/orders/:id/send` | `orderController.sendToKitchen` | `authenticate` + módulo `pos` (ya aplicado en `index.js:93` con `writeOnly`) |
| `GET` | `/api/kds/orders?status=` | `kdsController.listOrders` | `authenticate` + `requireModule('kds')` |
| `PATCH` | `/api/kds/orders/:id/status` | `kdsController.updateStatus` | `authenticate` + `requireModule('kds')` |
| `GET` | `/api/admin/orders?status=&limit=` | `adminOrdersController.list` | `authenticate` + **`adminOnly`** → FASE 15 |

> `PATCH` recibe `{ "status": "preparando" }`. Devuelve la orden actualizada.
> El controller captura el `SIGNAL` del SP y responde **409** con el mensaje.

### B.2 Archivos

```
back-end/src/
├── controllers/orderController.js   # + sendToKitchen; updateOrder revisa affected
├── controllers/kdsController.js     # nuevo (listOrders, updateStatus)
├── controllers/adminOrdersController.js  # nuevo (FASE 15)
├── routes/orders.js                 # + POST /:id/send; guard de permisos
├── routes/kds.js                    # nuevo
├── routes/adminOrders.js            # nuevo (FASE 15)
└── index.js                         # montaje + requireModule('kds')
```

### B.3 Correcciones de permisos (defectos existentes)

1. **`PUT /api/orders/:id` es `adminOnly`** → un Barista que retoma una orden
   pausada y vuelve a guardar recibe **403 silencioso** (y
   `apiClient.updateOrder` no revisa `response.ok`, así que el POS muestra
   *"Orden pausada"* igual). Se reemplaza `adminOnly` por una validación en el
   controller:
   - `Administrador` → siempre (mientras no sea `pagada`/`anulada`).
   - Otros roles con módulo `pos` → **solo si `status='pausada'`**.
2. **`orderController.updateOrder` ignora `affected`** de `sp_reopen_order` →
   si el guard falla borra/reinserta ítems igual. Ahora: `affected === 0` → **409**.
3. **`POST /:id/items`** no tiene guard → misma regla que arriba.
4. **`DELETE /:id/items/:itemId`** → `adminOnly` o status `pausada`.
5. `apiClient`: `updateOrder`, `voidOrder`, `addOrderItem`, `deleteOrderItem`
   deben revisar `response.ok` y lanzar el error del body (hoy fallan en silencio).

### B.4 Métodos nuevos en `apiClient.js`

```js
sendToKitchen(id)                  // POST /orders/:id/send
getKitchenOrders(status)           // GET  /kds/orders?status=
updateOrderStatus(id, status)      // PATCH /kds/orders/:id/status
getAdminOrders(status, limit)      // GET  /admin/orders        (FASE 15)
```

### Tareas — ✅ Sub-fase B completada (2026-09-28)
- [x] `kdsController` + `routes/kds.js` + montaje con `requireModule('kds')`
- [x] `sendToKitchen` en `orderController` y su ruta (`POST /:id/send`)
- [x] Corrección de permisos de `updateOrder` + revisión de `affected` + `updated_by`
- [x] Guards de `addOrderItem` / `deleteOrderItem` (misma regla, ver `orderLockError`)
- [x] `adminOrdersController` + `routes/adminOrders.js` + montaje con `adminOnly` (FASE 15)
- [x] `apiClient`: métodos nuevos + manejo de errores en los existentes
- [x] `paymentController`: el 409 devuelve `sqlMessage` (antes exponía SQL y parámetros)

### Criterios de aceptación — ✅ verificados contra el backend local
- [x] Barista con `pos` puede editar una orden **pausada** (200) y recibe **409** si está `enviada`
- [x] Administrador puede editar una orden `enviada`/`preparando` (200)
- [x] Cajero (sin `kds`) recibe **403** en `GET /api/kds/orders`
- [x] Transición inválida → **409** con el mensaje del `SIGNAL`
- [x] `POST /api/orders/:id/send` sobre una orden `lista` → **409**
- [x] Barista recibe **403** en `GET /api/admin/orders` (adminOnly)
- [x] Administrador editando una orden `pagada` → **409** (FASE 15)

> Prueba ejecutada: 19 escenarios (permisos KDS/admin, flujo `pausada → enviada →
> preparando → lista`, transiciones inválidas y guards de ítems) sobre
> `localhost:3000` con `admin/admin123`, `mateo/barista123`, `carlos/barista123`.
> Órdenes de prueba eliminadas al terminar.

---

## Sub-fase C — Pantalla de Cocina (KDS)

**Objetivo:** sustituir el placeholder de 52 líneas por la réplica del prototipo.

### C.1 Componentes

```
front-end/src/
├── pages/KdsPage.jsx              # reemplazar placeholder completo
├── components/kds/
│   ├── KdsCard.jsx                # tarjeta de orden
│   ├── KdsItemRow.jsx             # ítem + modificadores + badge NUEVO
│   ├── KdsStatusBadge.jsx         # pill de estado con color
│   └── KdsFilterChips.jsx         # chips con conteo
└── api/apiClient.js               # métodos de B.4
```

Clases CSS ya preparadas: `.kds-card` (`front-end/src/index.css:162`).

### C.2 Comportamiento (réplica de `prototipo/js/screens/kds-mobile.js`)

- **Header:** `coffee_maker`, título *"KDS Cocina"*, contador de pendientes con
  dot pulsante, alerta roja *"Retraso"* si alguna orden pasa de 15 min sin estar en `lista`.
- **Chips con conteo:** `Todos` / `Recibidos` / `En Preparacion` / `Listos`.
- **Orden:** `sent_at` ascendente (más vieja primero).
- **Tarjeta:** `#id` + pill de estado + temporizador en minutos; si
  `elapsed > 15` y estado ≠ `lista` → borde/fondo `error` + ícono `schedule`
  pulsante. Cuerpo: `table_bar` + *Mesa N* o *Para Llevar*, nombre del mesero,
  ítems con badge `N` ×, modificadores y etiqueta **NUEVO** si `prepared_at IS NULL`.
- **Acciones:** `Preparar` (→`preparando`), `Listo` (→`lista`), `Entregar`
  (→`completada`), `Anular` con `confirm()` → `DELETE /api/orders/:id`.
- **Vista columnas ↔ grid:** 3 columnas (`Recibido` / `En Preparacion` / `Listo`)
  con badge de conteo, o grid responsive `sm:2 lg:3`.
- **Reloj en vivo** (`HH:MM:SS`) y estado vacío *"Sin ordenes"*.
- **Refresco:** `setInterval(load, 15000)` para datos + `setInterval(30000)`
  para repintar temporizadores (limpiar ambos al desmontar).

### C.3 Acceso
- Ruta `/kds` ya protegida con `ProtectedRoute` + `ModuleRoute moduleKey="kds"` (`App.jsx:64`).
- Sidebar y MobileNav ya enlazan *"Cocina KDS"* → no requieren cambios.

### Tareas — ✅ completadas (2026-09-28)
- [x] `KdsPage.jsx` real (fetch + filtros + acciones + polling)
- [x] Componentes `kds/`: `KdsCard`, `KdsItemRow`, `KdsStatusBadge`, `KdsFilterChips`
- [x] Estados vacíos, error de API (banner descartable, sin romper la pantalla) y `loading`
- [x] `pnpm build` + `oxlint`

> Corrección asociada: `DELETE /api/orders/:id` dejó de ser `adminOnly` y ahora usa
> `requireModule(pool, 'kds')` (Administrador o rol con módulo `kds`), tal como indica la
> máquina de estados de esta fase. Sin eso, el botón **Anular** del KDS devolvía **403**
> para los Baristas. Se verificó: Barista → 200, Cajero (sin `kds`) → 403, Admin → 200.

> Nota de implementación: el temporizador y el estado de retraso se calculan desde
> `sent_at` con un `setInterval(30000)`; los datos se refrescan cada 15 s y el reloj cada s.
> `NUEVO` se muestra si `prepared_at IS NULL` y además la orden sigue `enviada` o el ítem
> todavía no fue enviado (`sent = 0`, caso de un producto agregado por el admin) — así el
> badge desaparece al pulsar **Preparar**, como exige el criterio, aunque `prepared_at` se
> marque recién en `lista`.

### Criterios de aceptación — ✅ verificados (2026-09-28)
- [x] Las órdenes `enviada`/`preparando`/`lista` aparecen con su temporizador
- [x] `Preparar` mueve la tarjeta a *En Preparacion* y marca los ítems (desaparece NUEVO)
- [x] Retraso >15 min pinta la tarjeta en rojo
- [x] Las órdenes `completada` desaparecen de la vista
- [x] Un cambio hecho en otra pestaña se refleja en ≤15 s sin recargar

> Verificación: contrato de `/api/kds/orders` comprobado contra el backend (crear → enviar →
> `preparando` → `lista` → `completada` → anular) y render de `KdsPage`/`KdsCard` con
> `react-dom/server` (21 comprobaciones: título, reloj, chips, tarjeta retrasada con borde
> rojo e `schedule`, badge `NUEVO`, botones Preparar/Listo y deshabilitado, conteos de chips).
> El refresco de 15 s corresponde al `setInterval` de `KdsPage`; la persistencia en pantalla
> se comprobó por código, no con navegador.

---

## Sub-fase D — POS: enviar a cocina

**Objetivo:** el mesero envía y monitorea el estado de su orden.

> ⚠️ **Prioridad:** desde la sub-fase A el cobro solo se permite en `lista`/`completada`,
> por lo que con el POS actual (sin este botón) una orden `pausada` devuelve **409** al
> cobrarse. Esta sub-fase es la que restablece el flujo completo.

### D.1 `PosPage.jsx`
- Botón **"Enviar a Cocina (N ítems)"** (ícono `send`) junto al actual
  *"Pausar Orden"*; visible si hay ítems por enviar (o si la orden está `pausada`
  con ítems nuevos).
- Flujo: si la orden no está guardada → `saveOrder()` y luego `sendToKitchen()`;
  si ya está guardada → `sendToKitchen(id)`.
- **Badge de estado** en el ticket: `Borrador` / `Pausada` / `En cocina`
  (pulsante) / `Preparando` / `Listo para cobrar` / `Completada`.
- Ítems ya enviados: atenuados, con `check` y texto **"EN COCINA"**, no editables.
- Si `status !== 'pausada'` → ocultar edición (el backend responde 409).

### D.2 `useOrder.js`
- Nueva acción `sendToKitchen()` → `api.sendToKitchen(orderId)` y recarga la
  orden (`api.getOrder`) para reflejar `sent`/`status`.
- `saveOrder()` conserva `PUT` solo mientras `status === 'pausada'`.

### D.3 `ParkedOrdersPanel.jsx`
- Botón **"Enviar a Cocina"** por tarjeta (junto a *Retomar*, *Cobrar*, *Anular*).
- **"Cobrar"** habilitado solo si `status === 'lista' || 'completada'`.

### Tareas — ✅ completadas (2026-09-29)
- [x] Botón de envío + lógica guardar-y-enviar
- [x] Badge de estado e ítems "EN COCINA"
- [x] Botón enviar en el panel de pausadas
- [x] `sp_get_order` expone `sent` (A.3) y el front lo consume

### Criterios de aceptación — ✅ verificados (2026-09-29)
- [x] Enviar marca `enviada` y la orden aparece en el KDS en ≤15 s
- [x] Enviar dos veces la misma orden no duplica ítems (solo los `sent=0`)
- [x] Un borrador pausado puede retomarse, editarse y enviarse
- [x] El ticket muestra *"Listo para cobrar"* cuando cocina marca `lista`

### Notas de implementación (2026-09-29)
- **`GET /api/orders?status=`** ahora acepta una **lista separada por comas**
  (validada contra el ENUM; `status` desconocido → **400**). `sp_list_parked_orders()`
  sigue usándose para el caso simple `pausada`; el resto se resuelve con un bucle de
  `sp_list_orders_by_status(?)` **sin tocar SQL**.
- `api.getActiveOrders()` consulta
  `?status=pausada,enviada,preparando,lista,completada`; el panel refresca cada **15 s**
  (además del disparo por `refreshTrigger`), por lo que una orden marcada `lista` por
  cocina aparece sola en el POS.
- `useOrder` guarda `status` (null = borrador), `saveOrder()` falla con
  *"Solo se pueden editar ordenes pausadas"* si la orden ya salió y
  `sendToKitchen(id)` recarga la orden para reflejar `sent`/`status`.
- `PosPage`: `canEdit = !orderId || status === 'pausada'` → oculta el selector de
  mesa/cliente/notas (aviso de solo lectura), el toggle de modo y los controles de
  ítems; el aviso de producto bloqueado aparece como toast.
- `TicketItem` renderiza `EN COCINA` (atenuado) si `sent`, y cantidad estática si
  `editable === false` (sin botones).
- Nuevos componentes: `OrderStatusBadge.jsx` (etiquetas del POS) —
  `KdsStatusBadge` queda como el badge exclusivo del KDS.
- Suite `test_d.ps1`: **17/17 OK** (D15 devuelve **201** con `payment_id`);
  SSR de componentes: **22/22 OK**; `pnpm build` + `oxlint` sin errores.

---

## Sub-fase E — Pantalla de órdenes del administrador

> **Pertenece a [FASE 15](FASE_15_ordenes_admin.md)** (sub-fase A + B son
> compartidas). No se detalla aquí.

---

## Sub-fase F — Dashboard y Caja

**Objetivo:** que el administrador vea las órdenes y que el cobro respete el nuevo flujo.

### F.1 `reportController.getDashboard` (`back-end/src/controllers/reportController.js`)
```sql
-- antes:  WHERE o.status = 'pausada' ... LIMIT 10
-- ahora:
WHERE o.status IN ('pausada','enviada','preparando','lista')
ORDER BY o.updated_at DESC
LIMIT 20
```
- `sp_get_dashboard_summary` con el `pending_orders` corregido (A.3).
- Mantener el catch, pero en el front **no** borrar todos los datos ante un error.

### F.2 `Dashboard.jsx`
- `setInterval(load, 15000)` (mismo patrón que `CajaPage.jsx:98`), limpiar al desmontar.
- Sección *"Ordenes Activas"*: añadir pill de estado + minutos, y enlace
  **"Ver todas → /ordenes"** (solo Administrador) y botón *"Abrir KDS"*.

### F.3 `CajaPage.jsx` — ✅ implementado (2026-09-29)
- `canPay = (status === 'lista' || status === 'completada') && pendingCount === 0 && shift && ...`
- Estados de la pantalla `PaymentView` (antes todo lo que no era `pausada`
  mostraba el falso *"Esta orden ya fue cobrada"* y ocultaba el detalle):
  - `pagada` → *"Esta orden ya fue cobrada"* · `anulada` → *"Esta orden fue anulada"*
  - `enviada`/`preparando` → *"Espera a que la cocina marque la orden como lista"*
  - `pausada` → *"Envía la orden a cocina antes de cobrar"*
  - `lista`/`completada` → detalle + método de pago + botón **Cobrar**
- El detalle de la orden (ítems, subtotal, IVA, total) se muestra en todo estado
  no pagado; si hay ítems con `sent = 0` se avisa y se deshabilita **Cobrar**
  (evita el 409 *"Hay items sin enviar a cocina"*).
- Botón **Anular orden** en la pantalla de Caja (con confirmación) para toda
  orden no pagada/anulada, y `handleAnular` del POS ahora muestra el error real.
- En `routes/orders.js` el guard de `DELETE /orders/:id` pasó de `kds` a
  **`pos`** (el Cajero tiene `pos=1` y `kds=0`); `/kds` conserva su guard.
- La entrada a cobrar sigue siendo el botón **Cobrar** del panel
  *"Órdenes en Curso"* (solo para `lista`/`completada`, ajuste D.3).

### Tareas
- [ ] Query del dashboard con todos los estados activos
- [ ] Refresco 15 s + enlaces en el Dashboard
- [x] `canPay` + mensajes en Caja (**F.3**, 2026-09-29)
- [x] `node --check` + `pnpm build`

### Criterios de aceptación
- [ ] El Dashboard muestra órdenes `enviada`/`preparando`/`lista` y las refresca solo
- [ ] Con más de 20 órdenes activas no se pierden sin aviso
- [x] Caja rechaza cobrar una orden `preparando` y permite cobrar una `lista`
- [ ] Tras cobrar, la orden pasa a `pagada` y sale de KDS y Dashboard
      (KDS verificado; Dashboard pendiente con F.1)

### Notas de verificación — F.3 (2026-09-29)
- `test_f.ps1`: **15/15 OK** — 409 en `enviada`/`preparando`, 409 con ítems sin
  enviar, 201 en `lista`, orden fuera de la lista activa, pago visible en
  *Movimientos del turno*, **Cajero anula `lista` → 200** (antes 403) y
  anular `pagada` → 409.
- SSR de los estados de Caja: **11/11 OK**; `oxlint` 0; `pnpm build` OK;
  `node --check` OK. Regresiones: `test_d` 18/18, `test_h` 26/26.
- Al reenviar ítems nuevos desde `lista` la orden vuelve a `enviada` (decisión H),
  por lo que la cocina debe recorrer `preparando → lista` antes de poder cobrar.

---

## Sub-fase G — Verificación y documentación

- [ ] `node --check back-end/src/controllers/*.js back-end/src/routes/*.js`
- [ ] `pnpm build` + `pnpm exec oxlint` en `front-end` (sin errores nuevos)
- [ ] Revisión estática de los SQL (conteos, FKs, ASCII/sin BOM) — **sin ejecutar SQL**
- [ ] Prueba manual del flujo completo:
      `pausar → enviar → Preparar → Listo → cobrar` + edición admin (FASE 15) + anulación
- [ ] Prueba de permisos: anular exige módulo `pos` (Cajero/Barista ✓, 2026-09-29);
      la pantalla `/kds` sigue exigiendo `kds`; Barista edita solo `pausada`
- [ ] Actualizar `documentacion/README.md`, FASE 05 y FASE 15 a **✅ Completada**
- [ ] Actualizar `documentacion/ManualDeUsuario.md` (flujo de cocina y cobro)

---

## Sub-fase H — Agregar ítems a ordenes en curso (POS)

**Objetivo:** el mesero puede agregar productos a una orden que ya salió a cocina
(p. ej. el cliente pide algo más tarde) sin tocar lo ya entregado.

> **Decisiones del cliente (2026-09-29):** solo **agregar** ítems nuevos; editable en
> `pausada|enviada|preparando|lista|completada` (nunca `pagada`/`anulada`); al reenviar
> la orden vuelve a **`enviada`**; la edición se hace **desde el POS** (panel).

### H.1 Backend (`back-end/src/controllers/`)
- `orderController.js`
  - `POST /:id/items` sin bloqueo de estado (el SP ya valida `pagada`/`anulada` → 409);
    el ítem nace con `sent = 0` y recalcula totales.
  - `DELETE /:id/items/:itemId`: consulta `order_items.sent` + `orders.status`;
    409 si `sent = 1` (*"El item ya fue enviado a cocina y no se puede eliminar"*) o si
    la orden está pagada/anulada; ítem inexistente → **404** (antes devolvía 200 sin borrar).
  - `PUT /:id`: cabecera (mesa/cliente/notas/modo) editable en cualquier estado no pagado;
    el array `items` solo en `pausada` → 409 *"Solo se pueden reemplazar los items de una
    orden pausada"* (evita perder `sent` con `sp_clear_order_items`).
  - se eliminó `orderLockError` (reemplazada por las reglas anteriores).
- `kdsController.js`: `groupByOrder` omite los ítems `sent = 0` y descarta las órdenes
  que quedan sin ítems visibles (la cocina no ve lo que aún no se envió).
- `paymentController.js`: 409 *"Hay items sin enviar a cocina"* si la orden tiene
  `sent = 0` (impide cobrar algo que nunca llegó a cocina).

### H.2 SQL — `sp_send_to_kitchen` (migración 019 + 3 espejos)
- Estados admitidos: `pausada|enviada|preparando|lista|completada`
  (`pagada`/`anulada` → 409).
- Marca **solo** los ítems con `sent = 0`; si no hay pendientes →
  409 *"No hay items nuevos para enviar a cocina"* (conserva el bloqueo de doble envío).
- `status = 'enviada'` siempre; si venía de `pausada`, `lista` o `completada` renueva
  `sent_at` y limpia `ready_at`/`completed_at` (el cronómetro del KDS y los tiempos de
  cocina corresponden al nuevo ciclo).
- Archivos: `database/migrations/019_editar_ordenes_activas.sql` (**aplicada** a
  `comandapro`), `database/procedures/006_order_procedures.sql`,
  `Deploy/Test/sp_transaccionales.sql`, `Deploy/Produccion/sp_transaccionales.sql`.

### H.3 Frontend
- `useOrder.js`: cada ítem lleva `persisted` (`loadOrder` → `true`, `addItem` → `false`);
  `saveOrder()` elige el camino: nueva → `createOrder`; `pausada` → `PUT` con **todos**
  los ítems; activa → `POST /:id/items` por ítem nuevo y recarga la orden.
- `PosPage.jsx`: `canReplace` (nueva/pausada), `isAppendMode` (activa), `canAdd`;
  botones **Enviar a Cocina (N)** + **Guardar** en modo agregar; aviso de solo lectura
  para la cabecera; `handleRemoveItem` borra vía API los ítems ya persistidos.
- `Ticket.jsx` / `TicketItem.jsx`: prop `allowPersistedEdits` controla la cantidad de los
  ítems ya guardados; los no enviados siempre se pueden borrar; los enviados quedan con
  **EN COCINA**.
- `ParkedOrdersPanel.jsx`: botón **Agregar** en las tarjetas de órdenes activas
  (junto a *Cobrar* y *Anular*).

### Tareas — ✅ completadas (2026-09-29)
- [x] Reglas de edición en `orderController` (agregar / borrar / cabecera / replace)
- [x] `sp_send_to_kitchen` incremental + migración 019 aplicada
- [x] KDS oculta ítems pendientes y el cobro se bloquea con pendientes
- [x] Modo "agregar" en el POS (grid + ticket + botones)
- [x] Botón **Agregar** en el panel de órdenes en curso

### Criterios de aceptación — ✅ verificados (2026-09-29)
- [x] Agregar un ítem a una orden `enviada` → 201 y `sent = 0` (los entregados no cambian)
- [x] Borrar un ítem enviado → 409; borrar un ítem pendiente → 200
- [x] Reenviar marca solo los pendientes; sin pendientes → 409 (sin duplicar ítems)
- [x] `lista` + agregar + reenviar → la orden vuelve a `enviada` y `sent_at` se renueva
- [x] Cobrar con pendientes → 409; una orden `pagada` devuelve 409 en item/cabecera/envío
- [x] El KDS no muestra los ítems sin enviar

### Notas de verificación (2026-09-29)
- Suite `test_h.ps1`: **26/26 OK**; regresión `test_d.ps1` (expectativas ajustadas a H):
  **18/18 OK**; SSR de componentes: **12/12 OK**; `pnpm build` + `oxlint` sin errores;
  `node --check` OK; migración 019 re-ejecutable (idempotente).
- `DELETE /orders/:id/items/:itemId` ahora responde **404** cuando el ítem no existe
  (antes devolvía 200 sin eliminar nada).

---

## Riesgos y pendientes conocidos

| # | Riesgo / pendiente | Mitigación |
|---|--------------------|------------|
| 1 | Sin websockets: retraso máximo 15 s entre pantallas | Aceptado por el cliente (polling 10-15 s) |
| 2 | Caché de permisos de 5 min (`middleware/auth.js`) | Reiniciar backend tras tocar `role_permissions` |
| 3 | El cambio de flujo (cobrar solo `lista`/`completada`) rompe el Manual de Usuario actual | Actualizarlo en G |
| 4 | El rol Cajero no tiene `kds` (semilla) y no verá la cocina | Por diseño; revísalo con el cliente si cocina necesita cajero |
| 5 | No hay suite de tests activa en el repo (Jest/Playwright sin casos) | Prueba manual en G; FASE 12 sigue pendiente |
| 6 | `Deploy/Test/seed.sql` no coincide con el de Producción | Decisión del usuario (2026-09-28): se revisó y **se queda como está**; retomarlo después |
| 7 | FASE 04 y FASE 06 siguen documentando "sin KDS / cobro manual" | Actualizar en G |
| 8 | `sp_deduct_inventory` / inventario siguen deduciendo **al pagar** | Sin cambio |
| 9 | Bugs conocidos fuera de alcance: `updateProduct` escribe `image=null` y no hay handler de errores de multer | Pendiente de revisión aparte, cuando se atiendan los bugs |
| 10 | ~~**Bloqueo transitorio:** el cobro ya exige `lista`/`completada` pero el POS no expone **Enviar a Cocina**~~ | **Resuelto (sub-fase D, 2026-09-29):** el POS ya envía a cocina y el panel ofrece *Cobrar* solo en `lista`/`completada` |

---

## Archivos que toca esta fase

| Tipo | Archivos |
|------|----------|
| SQL | `database/migrations/018_kds_cocina.sql`, **`019_editar_ordenes_activas.sql` (H)**, `database/procedures/006_order_procedures.sql`, `011_report_procedures.sql`, `Deploy/Produccion/{migrations/018, sp_lectura, sp_transaccionales, sp_simple}.sql`, espejo `Deploy/Test/` |
| Backend | `orderController.js`, `kdsController.js` (nuevo), `paymentController.js` (H), `adminOrdersController.js` (nuevo, FASE 15), `routes/orders.js`, `routes/kds.js` (nuevo), `routes/adminOrders.js` (nuevo), `index.js`, `reportController.js` |
| Frontend | `KdsPage.jsx`, `components/kds/*` (nuevos), `utils/format.js`, `PosPage.jsx`, `useOrder.js`, `ParkedOrdersPanel.jsx`, `Ticket.jsx`, `TicketItem.jsx`, `OrderStatusBadge.jsx` (nuevo), `CajaPage.jsx`, `Dashboard.jsx`, `apiClient.js` |
| Docs | este archivo, FASE 15, `documentacion/README.md` |
