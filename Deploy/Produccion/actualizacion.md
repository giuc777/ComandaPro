# Actualizacion incremental - ComandaPro (Produccion)

Guia para actualizar una base **ya instalada** (`DeerCoffeeDB`) desde la version
desplegada hasta la actual (KDS de cocina, pantalla `/ordenes` del administrador,
Dashboard y cobro en Caja).

> **Regla de oro:** en produccion solo se usan **migraciones incrementales** y los
> `sp_*.sql`. **NUNCA** se ejecutan `schema.sql` ni `seed.sql`:
> `schema.sql` contiene `DROP TABLE` (borra productos, ordenes y pagos) y
> `seed.sql` inserta usuarios/productos con IDs fijos (duplica o choca).
> Ver [`../README.md`](../README.md) seccion 13.

---

## 0. Alcance de esta actualizacion

| Version en produccion | Hasta `c7bc14b` (incluye la migracion 017 de menu) |
|-----------------------|-----------------------------------------------------|
| Se agrega             | FASE 05 (KDS cocina, D/H/F.3), FASE 15 (`/ordenes`), F.1/F.2 (Dashboard), FASE 09 (mesas: dos estados + cambio manual), FASE 10 §8 (caja: ingresos y egresos manuales) |
| Migracion nueva       | `migrations/018_kds_cocina.sql`, `migrations/020_mesa_libre_ocupada.sql`, `migrations/021_caja_ingresos_egresos.sql` |
| Procedimientos        | `sp_simple.sql`, `sp_transaccionales.sql`, `sp_lectura.sql` |
| Codigo                | backend (`pnpm install`) + frontend (`pnpm build`) |

**Orden obligatorio: primero la base de datos, despues reiniciar el backend.**
Si el backend nuevo arranca con la base vieja, el KDS y `/ordenes` fallan con
`PROCEDURE sp_get_kds_orders does not exist` / `Unknown column 'o.sent_at'`, el
endpoint `PUT /api/tables/:id/status` falla con
`PROCEDURE sp_update_table_status does not exist`, y los ingresos/egresos de
caja fallan con `Unknown column 'concept' in 'field list'` / argumentos de
`sp_record_shift_transaction` desalineados.

---

## 1. Verificacion previa (solo lectura)

```bash
mysql -u comandapro_user -p -e "
  SELECT COUNT(*) AS cols_kds FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='orders'
    AND COLUMN_NAME IN ('sent_at','started_at','ready_at','completed_at','updated_by');
  SHOW PROCEDURE STATUS WHERE Db='DeerCoffeeDB' AND Name IN
    ('sp_get_kds_orders','sp_get_orders_admin','sp_send_to_kitchen','sp_record_payment','sp_update_table_status');
  SELECT COUNT(*) AS ordenes_activas FROM DeerCoffeeDB.orders
   WHERE status IN ('pausada','enviada','preparando','lista');
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='tables' AND COLUMN_NAME='status';
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='shift_transactions' AND COLUMN_NAME='type';
  SELECT COUNT(*) AS cols_caja FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='shift_transactions'
     AND COLUMN_NAME='concept';
"
```

- `cols_kds = 0` y solo `sp_send_to_kitchen` / `sp_record_payment` presentes
  => la migracion 018 y los SP nuevos **faltan** (situacion normal hasta `c7bc14b`).
- `sp_update_table_status` ausente o `COLUMN_TYPE` con `'dirty'` => falta la
  migracion 020 (situacion normal hasta `c7bc14b`).
- `shift_transactions.type` sin `'income'`/`'expense'` o `cols_caja = 0` =>
  falta la migracion 021.
- `ordenes_activas > 0` => anotar el numero: se usa en el paso 5.

---

## 2. Backup + conteos de referencia

```bash
cd ~/desarrollo
mysqldump -u comandapro_user -p DeerCoffeeDB > respaldo_antes_kds_$(date +%Y%m%d).sql

mysql -u comandapro_user -p DeerCoffeeDB -e "
  SELECT (SELECT COUNT(*) FROM products)      AS productos,
         (SELECT COUNT(*) FROM payments)      AS pagos,
         (SELECT COUNT(*) FROM shift_transactions) AS movimientos,
         (SELECT COUNT(*) FROM orders)        AS ordenes,
         (SELECT COUNT(*) FROM order_items)   AS items;"
```

Anotar los 5 numeros: se repiten en el paso 7 y **deben ser identicos**.

---

## 3. Codigo

```bash
cd ~/desarrollo
git pull
```

---

## 4. Base de datos (6 archivos, en este orden)

```bash
cd ~/desarrollo/Deploy/Produccion

mysql -u comandapro_user -p DeerCoffeeDB < migrations/018_kds_cocina.sql
mysql -u comandapro_user -p DeerCoffeeDB < migrations/020_mesa_libre_ocupada.sql
mysql -u comandapro_user -p DeerCoffeeDB < migrations/021_caja_ingresos_egresos.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_simple.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_transaccionales.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_lectura.sql
```

| # | Archivo | Aporta | Tipo |
|---|---------|--------|------|
| 1 | `migrations/018_kds_cocina.sql` | 8 columnas nuevas (`orders.sent_at/started_at/ready_at/completed_at/updated_by`, `order_items.sent/sent_at/prepared_at`) + indice `idx_orders_kds` + FK `fk_orders_updated_by` | Aditivo (`ADD COLUMN IF NOT EXISTS`), no toca filas existentes |
| 2 | `migrations/020_mesa_libre_ocupada.sql` | Mesa con **dos estados**: sanea `dirty -> free` y mesas `occupied` sin orden activa, y reduce el ENUM a `enum('free','occupied')` | Aditivo sobre `tables`, solo afecta filas de mesas |
| 3 | `migrations/021_caja_ingresos_egresos.sql` | Caja: columna `shift_transactions.concept` (VARCHAR 120) y ENUM ampliado a `('sale','refund','void','income','expense')` | Aditivo; no cambia filas existentes |
| 4 | `sp_simple.sql` | Cabecera editable en cualquier estado no pagado (regla H), `sp_void_order` **libera la mesa** y `sp_reopen_order` **sincroniza mesas** al cambiar `table_id` (409 si la destino esta ocupada); `sp_close_shift` descuenta egresos en el efectivo esperado y `sp_record_shift_transaction` valida ingresos/egresos manuales | Solo procedimientos |
| 5 | `sp_transaccionales.sql` | `sp_create_parked_order` (409 si la mesa esta ocupada), `sp_record_payment` (libera la mesa en `free`), `sp_update_table_status` (cambio manual), `sp_send_to_kitchen`, `sp_update_order_status`, `sp_add_order_item` | Solo procedimientos |
| 6 | `sp_lectura.sql` | **Nuevos** `sp_get_kds_orders` y `sp_get_orders_admin` + dashboard con los 4 estados activos + `concept`/ingresos/egresos en las lecturas de caja | Solo procedimientos |

Notas:

- Los 6 archivos son **idempotentes**: se pueden re-ejecutar sin peligro
  (`ADD COLUMN IF NOT EXISTS`, `DROP PROCEDURE IF EXISTS` + `CREATE`, y la 020
  no vuelve a afectar filas si ya esta aplicada). Excepcion menor: el
  `ADD COLUMN concept` de la 021 no es idempotente y re-ejecutarlo da
  `ERROR 1060 (Duplicate column name)` sin efectos secundarios; se puede pasar
  por alto.
- **La migracion 019 no se aplica aparte**: su contenido (el
  `sp_send_to_kitchen` final con validacion de items pendientes) ya viene en
  `sp_transaccionales.sql`.
- **No** ejecutar `schema.sql` ni `seed.sql` en esta base.

---

## 5. Backfill opcional (solo si hay ordenes activas al corte)

Si `ordenes_activas > 0` (paso 1), los items de esas ordenes quedarian con
`sent = 0` y la cocina los veria otra vez como pendientes. En ese caso:

```sql
USE `DeerCoffeeDB`;
UPDATE order_items oi JOIN orders o ON o.id = oi.order_id
   SET oi.sent = 1, oi.sent_at = o.sent_at
 WHERE o.status IN ('enviada','preparando','lista','completada','pagada')
   AND oi.sent = 0;
```

Si el corte se hace con la tienda cerrada (0 ordenes activas), **no hace falta**.

---

## 6. Frontend y backend

```bash
cd ~/desarrollo/front-end && pnpm install && pnpm build
cd ../back-end && pnpm install
sudo systemctl restart comandapro-backend
```

---

## 7. Verificacion posterior

```bash
# API viva
curl -s http://localhost:3000/api/health

# SP nuevos instalados
mysql -u comandapro_user -p DeerCoffeeDB -e "
  SHOW PROCEDURE STATUS WHERE Db='DeerCoffeeDB' AND Name IN
   ('sp_get_kds_orders','sp_get_orders_admin','sp_update_table_status');"

# Columnas nuevas (debe dar 5)
mysql -u comandapro_user -p -e "
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='orders'
    AND COLUMN_NAME IN ('sent_at','started_at','ready_at','completed_at','updated_by');"

# Mesa: enum de dos estados y sin 'dirty' (la 020)
mysql -u comandapro_user -p -e "
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='tables' AND COLUMN_NAME='status';
  SELECT status, COUNT(*) FROM DeerCoffeeDB.tables GROUP BY status;"

# Caja: enum con income/expense + columna concept (la 021)
mysql -u comandapro_user -p -e "
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='shift_transactions' AND COLUMN_NAME='type';
  SELECT COLUMN_NAME FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='shift_transactions' AND COLUMN_NAME='concept';"

# Los conteos del paso 2 deben ser IDENTICOS (productos/pagos/movimientos/ordenes/items)
mysql -u comandapro_user -p DeerCoffeeDB -e "
  SELECT (SELECT COUNT(*) FROM products) AS productos,
         (SELECT COUNT(*) FROM payments) AS pagos,
         (SELECT COUNT(*) FROM shift_transactions) AS movimientos;"
```

Prueba manual en la app:

1. Login `admin` -> el Dashboard muestra las ordenes activas y se refresca.
2. `/kds` carga y refleja los estados (barista/cocina).
3. `/ordenes` (solo Administrador) lista, filtra y edita una orden.
4. En Caja, una orden `lista` se cobra; una orden `pausada` devuelve **409**.
5. Mesas: en el selector del POS crear una orden deja la mesa **Ocupada**;
   una segunda orden en esa mesa devuelve **409**; al cobrar o anular vuelve
   a **Libre**; el candado cambia el estado a mano (y no deja liberar una
   mesa con orden activa).
6. Caja con turno abierto: **Ingresar** (propina, efectivo) y **Retirar**
   (compra de ingredientes, efectivo) quedan en *Movimientos del turno*, suben/
   bajan los indicadores y el **Efectivo esperado** del arqueo; un egreso en
   tarjeta devuelve **400**.

---

## 8. Que cambia (comportamiento, no datos)

| Antes (`c7bc14b`) | Ahora |
|---|---|
| Cobrar cualquier orden `pausada` | El cobro solo se permite en **`lista`/`completada`**; `pausada` -> 409 |
| Sin pantalla de cocina | `/kds` con los estados de la orden y refresco cada 15 s |
| Ordenes no editables fuera de pausada | Cabecera editable por cualquier rol con modulo `pos` (regla H); reemplazar **items** solo Administrador o en `pausada` (409 en el resto) |
| Items sin estado de envio | `order_items.sent` controla que la cocina vea solo lo enviado |
| Mesa con 3 estados (`free`/`occupied`/`dirty`): al cobrar quedaba `dirty` para siempre | **Dos estados**: al cobrar o anular la mesa vuelve a `free`; cambio manual desde el selector de mesas y desde Catálogos (409 si hay orden activa) |
| Mover una orden de mesa no sincronizaba los estados | `sp_reopen_order` libera la origen y ocupa la destino; crea/mover a una mesa con otra orden activa -> **409** |
| La caja solo tenia ventas | Ingresos y egresos manuales (propina, retiro para compras) con concepto obligatorio: se registran en `shift_transactions` (`income`/`expense`) y ajustan el efectivo esperado del arqueo |

**No cambian:** productos, precios, inventario, proveedores, pagos, turnos,
movimientos de caja ni ordenes ya registradas. La unica data que toca la 020
son las filas de `tables` en `dirty` o `occupied` sin orden activa (pasa a
`free`). La 021 no modifica filas: solo agrega la columna `concept` (los
movimientos existentes quedan con `concept = NULL`).

---

## 9. Rollback

Si algo sale mal, se restaura el respaldo del paso 2 y se vuelve al codigo anterior:

```bash
sudo systemctl stop comandapro-backend

# restaurar la base completa (DROP + CREATE + dump)
mysql -u comandapro_user -p -e "DROP DATABASE IF EXISTS \`DeerCoffeeDB\`; CREATE DATABASE \`DeerCoffeeDB\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u comandapro_user -p DeerCoffeeDB < respaldo_antes_kds_YYYYMMDD.sql

# volver el codigo a la version anterior al KDS
cd ~/desarrollo && git checkout c7bc14b
cd back-end && pnpm install && sudo systemctl start comandapro-backend
# despues, para seguir en rama main:
# cd ~/desarrollo && git checkout main
```

> Las columnas nuevas (`ADD COLUMN`) no estorban a la version anterior: si el
> problema es solo de codigo, alcanza con restaurar el respaldo, hacer
> `git checkout c7bc14b` y reiniciar el backend (la base puede quedarse como
> esta: los SP y columnas extra no rompen la version vieja).

> **Atencion con la migracion 020:** el ENUM de `tables` dejo de aceptar
> `'dirty'`. Si se vuelve al codigo anterior **sin** restaurar la base, el
> `sp_record_payment` viejo falla al intentar marcar la mesa como `dirty`
> (ERROR 1265). En el rollback hay que restaurar el respaldo (que trae el
> ENUM de 3 estados) junto con el codigo, o re-anchar el ENUM con
> `ALTER TABLE tables MODIFY status ENUM('free','occupied','dirty') DEFAULT 'free';`.

> **Atencion con la migracion 021:** si se revierte **solo el codigo** sin
> restaurar la base, el `sp_close_shift` viejo no descuenta los egresos del
> efectivo esperado (el arqueo saldria con sobrante) y el
> `sp_record_shift_transaction` viejo recibe 5 argumentos contra una firma de
> 6 (`Incorrect number of arguments`). Restaurar el respaldo del paso 2 junto
> con el codigo, o volver a aplicar el `sp_close_shift` /
> `sp_record_shift_transaction` anteriores.

---

## 10. Resumen en 6 lineas

```
1. mysqldump + conteos            (respaldo y referencia)
2. git pull                       (codigo y archivos .sql)
3. 018 + 020 + 021 + sp_simple + sp_transaccionales + sp_lectura   (base, antes de reiniciar)
4. backfill de sent SOLO si hay ordenes activas
5. pnpm build + restart backend
6. health + conteos identicos + prueba de kds/ordenes/cobro/mesas/caja
```
