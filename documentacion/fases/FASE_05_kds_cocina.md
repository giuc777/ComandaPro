# FASE 05 — Kitchen Display System (KDS) (implementación)

**Estado:** 📋 Plan de implementación
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
| `sp_send_to_kitchen` | `(IN p_order_id INT)` | `SIGNAL` si `status <> 'pausada'`; `UPDATE order_items SET sent=1, sent_at=NOW() WHERE order_id=? AND sent=0`; `UPDATE orders SET status='enviada', sent_at=NOW()`; `SELECT id, status` |
| `sp_update_order_status` | `(IN p_order_id INT, IN p_status ENUM('enviada','preparando','lista','completada'))` | Valida la transición permitida (tabla anterior). En `preparando` marca `started_at` y `prepared_at` de ítems sin preparar; en `lista` marca `ready_at`; en `completada` marca `completed_at`. `SIGNAL` si el estado actual no permite el cambio |
| `sp_get_kds_orders` | `(IN p_status VARCHAR(20))` | Una sola consulta **plana** (fila por ítem) de `status IN ('enviada','preparando','lista')` — filtro opcional `p_status` — con `TIMESTAMPDIFF(MINUTE, sent_at, NOW()) AS minutes_waiting`, `table_name`, `customer_name`, `mode`, `created_by_name`, ítem (`product_name`, `quantity`, `modifier_labels`, `notes`, `prepared_at`). `ORDER BY sent_at ASC, oi.id` |
| `sp_get_orders_admin` | `(IN p_status VARCHAR(20), IN p_limit INT)` | Igual que el anterior pero incluye `pausada` y `completada`, `subtotal/tax/total`, `created_at`; usado por FASE 15 |

> Las filas planas se agrupan por `order_id` en el controller → **1 consulta**
> para toda la cocina (evita N+1).

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

### Tareas
- [ ] `018_kds_cocina.sql` (migración idempotente: columnas + índice)
- [ ] SPs nuevos (4) en `sp_transaccionales.sql` / `sp_lectura.sql`
- [ ] Correcciones de los 6 SP existentes (A.3)
- [ ] Espejo en `database/procedures/` y `Deploy/Test/`
- [ ] Revisión estática: firmas, `SIGNAL`, FKs, ASCII sin BOM

### Criterios de aceptación
- [ ] Las 7 columnas nuevas existen con índice `idx_orders_kds`
- [ ] `sp_update_order_status` rechaza `pausada → preparando` y `lista → preparando`
- [ ] `sp_send_to_kitchen` solo acepta órdenes `pausada` y deja `sent=1` solo a los ítems nuevos
- [ ] `sp_record_payment` rechaza `enviada`/`preparando` y acepta `lista`/`completada`
- [ ] El archivo compila idempotente (re-ejecutarlo no falla)

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

### Tareas
- [ ] `kdsController` + `routes/kds.js` + montaje con `requireModule('kds')`
- [ ] `sendToKitchen` en `orderController` y su ruta
- [ ] Corrección de permisos de `updateOrder` + revisión de `affected`
- [ ] Guards de `addOrderItem` / `deleteOrderItem`
- [ ] `apiClient`: métodos nuevos + manejo de errores en los existentes

### Criterios de aceptación
- [ ] Barista con `pos` puede editar una orden **pausada** (200) y recibe **409** si está `enviada`
- [ ] Administrador puede editar una orden `preparando` (200)
- [ ] Cajero (sin `kds`) recibe **403** en `GET /api/kds/orders`
- [ ] Transición inválida → **409** con el mensaje del `SIGNAL`
- [ ] `POST /api/orders/:id/send` sobre una orden `lista` → **409**

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

### Tareas
- [ ] `KdsPage.jsx` real (fetch + filtros + acciones + polling)
- [ ] Componentes `kds/`
- [ ] Estados vacíos, error de API (sin romper la pantalla) y `loading`
- [ ] `pnpm build` + `oxlint`

### Criterios de aceptación
- [ ] Las órdenes `enviada`/`preparando`/`lista` aparecen con su temporizador
- [ ] `Preparar` mueve la tarjeta a *En Preparacion* y marca los ítems (desaparece NUEVO)
- [ ] Retraso >15 min pinta la tarjeta en rojo
- [ ] Las órdenes `completada` desaparecen de la vista
- [ ] Un cambio hecho en otra pestaña se refleja en ≤15 s sin recargar

---

## Sub-fase D — POS: enviar a cocina

**Objetivo:** el mesero envía y monitorea el estado de su orden.

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

### Tareas
- [ ] Botón de envío + lógica guardar-y-enviar
- [ ] Badge de estado e ítems "EN COCINA"
- [ ] Botón enviar en el panel de pausadas
- [ ] `sp_get_order` expone `sent` (A.3) y el front lo consume

### Criterios de aceptación
- [ ] Enviar marca `enviada` y la orden aparece en el KDS en ≤15 s
- [ ] Enviar dos veces la misma orden no duplica ítems (solo los `sent=0`)
- [ ] Un borrador pausado puede retomarse, editarse y enviarse
- [ ] El ticket muestra *"Listo para cobrar"* cuando cocina marca `lista`

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

### F.3 `CajaPage.jsx`
- `canPay = order && (order.status === 'lista' || order.status === 'completada') && shift && ...`
- Mensaje contextual: si la orden está `enviada`/`preparando` →
  *"Espera a que la cocina marque la orden como lista"*.
- El selector/lista desde la que se entra a cobrar debe ofrecer órdenes
  `lista`/`completada` (hoy solo sale de *Cobrar* en el panel de pausadas,
  que ya se ajusta en D.3).

### Tareas
- [ ] Query del dashboard con todos los estados activos
- [ ] Refresco 15 s + enlaces en el Dashboard
- [ ] `canPay` + mensajes en Caja
- [ ] `node --check` + `pnpm build`

### Criterios de aceptación
- [ ] El Dashboard muestra órdenes `enviada`/`preparando`/`lista` y las refresca solo
- [ ] Con más de 20 órdenes activas no se pierden sin aviso
- [ ] Caja rechaza cobrar una orden `preparando` y permite cobrar una `lista`
- [ ] Tras cobrar, la orden pasa a `pagada` y sale de KDS y Dashboard

---

## Sub-fase G — Verificación y documentación

- [ ] `node --check back-end/src/controllers/*.js back-end/src/routes/*.js`
- [ ] `pnpm build` + `pnpm exec oxlint` en `front-end` (sin errores nuevos)
- [ ] Revisión estática de los SQL (conteos, FKs, ASCII/sin BOM) — **sin ejecutar SQL**
- [ ] Prueba manual del flujo completo:
      `pausar → enviar → Preparar → Listo → cobrar` + edición admin (FASE 15) + anulación
- [ ] Prueba de permisos: Cajero sin `kds` → 403; Barista edita solo `pausada`
- [ ] Actualizar `documentacion/README.md`, FASE 05 y FASE 15 a **✅ Completada**
- [ ] Actualizar `documentacion/ManualDeUsuario.md` (flujo de cocina y cobro)

---

## Riesgos y pendientes conocidos

| # | Riesgo / pendiente | Mitigación |
|---|--------------------|------------|
| 1 | Sin websockets: retraso máximo 15 s entre pantallas | Aceptado por el cliente (polling 10-15 s) |
| 2 | Caché de permisos de 5 min (`middleware/auth.js`) | Reiniciar backend tras tocar `role_permissions` |
| 3 | El cambio de flujo (cobrar solo `lista`/`completada`) rompe el Manual de Usuario actual | Actualizarlo en G |
| 4 | El rol Cajero no tiene `kds` (semilla) y no verá la cocina | Por diseño; revísalo con el cliente si cocina necesita cajero |
| 5 | No hay suite de tests activa en el repo (Jest/Playwright sin casos) | Prueba manual en G; FASE 12 sigue pendiente |
| 6 | `Deploy/Test/seed.sql` está desincronizado con Producción | Pendiente aparte |
| 7 | FASE 04 y FASE 06 siguen documentando "sin KDS / cobro manual" | Actualizar cuando la fase esté implementada |
| 8 | `sp_deduct_inventory` / inventario siguen deduciendo **al pagar** | Sin cambio |

---

## Archivos que toca esta fase

| Tipo | Archivos |
|------|----------|
| SQL | `database/migrations/018_kds_cocina.sql`, `database/procedures/006_order_procedures.sql`, `011_report_procedures.sql`, `Deploy/Produccion/{migrations/018, sp_lectura, sp_transaccionales, sp_simple}.sql`, espejo `Deploy/Test/` |
| Backend | `orderController.js`, `kdsController.js` (nuevo), `routes/orders.js`, `routes/kds.js` (nuevo), `index.js`, `reportController.js` |
| Frontend | `KdsPage.jsx`, `components/kds/*` (nuevos), `PosPage.jsx`, `useOrder.js`, `ParkedOrdersPanel.jsx`, `CajaPage.jsx`, `Dashboard.jsx`, `apiClient.js` |
| Docs | este archivo, FASE 15, `documentacion/README.md` |
