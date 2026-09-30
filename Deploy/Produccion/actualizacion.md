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
| Se agrega             | FASE 05 (KDS cocina, D/H/F.3), FASE 15 (`/ordenes`), F.1/F.2 (Dashboard) |
| Migracion nueva       | `migrations/018_kds_cocina.sql` |
| Procedimientos        | `sp_simple.sql`, `sp_transaccionales.sql`, `sp_lectura.sql` |
| Codigo                | backend (`pnpm install`) + frontend (`pnpm build`) |

**Orden obligatorio: primero la base de datos, despues reiniciar el backend.**
Si el backend nuevo arranca con la base vieja, el KDS y `/ordenes` fallan con
`PROCEDURE sp_get_kds_orders does not exist` / `Unknown column 'o.sent_at'`.

---

## 1. Verificacion previa (solo lectura)

```bash
mysql -u comandapro_user -p -e "
  SELECT COUNT(*) AS cols_kds FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='orders'
    AND COLUMN_NAME IN ('sent_at','started_at','ready_at','completed_at','updated_by');
  SHOW PROCEDURE STATUS WHERE Db='DeerCoffeeDB' AND Name IN
    ('sp_get_kds_orders','sp_get_orders_admin','sp_send_to_kitchen','sp_record_payment');
  SELECT COUNT(*) AS ordenes_activas FROM DeerCoffeeDB.orders
   WHERE status IN ('pausada','enviada','preparando','lista');
"
```

- `cols_kds = 0` y solo `sp_send_to_kitchen` / `sp_record_payment` presentes
  => la migracion 018 y los SP nuevos **faltan** (situacion normal hasta `c7bc14b`).
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

## 4. Base de datos (4 archivos, en este orden)

```bash
cd ~/desarrollo/Deploy/Produccion

mysql -u comandapro_user -p DeerCoffeeDB < migrations/018_kds_cocina.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_simple.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_transaccionales.sql
mysql -u comandapro_user -p DeerCoffeeDB < sp_lectura.sql
```

| # | Archivo | Aporta | Tipo |
|---|---------|--------|------|
| 1 | `migrations/018_kds_cocina.sql` | 8 columnas nuevas (`orders.sent_at/started_at/ready_at/completed_at/updated_by`, `order_items.sent/sent_at/prepared_at`) + indice `idx_orders_kds` + FK `fk_orders_updated_by` | Aditivo (`ADD COLUMN IF NOT EXISTS`), no toca filas existentes |
| 2 | `sp_simple.sql` | Cabecera de la orden editable en cualquier estado no pagado (regla H) | Solo procedimientos |
| 3 | `sp_transaccionales.sql` | `sp_send_to_kitchen` (marca `sent`, renueva `sent_at`), `sp_record_payment`, `sp_update_order_status`, `sp_add_order_item` | Solo procedimientos |
| 4 | `sp_lectura.sql` | **Nuevos** `sp_get_kds_orders` y `sp_get_orders_admin` + dashboard con los 4 estados activos | Solo procedimientos |

Notas:

- Los 4 archivos son **idempotentes**: se pueden re-ejecutar sin peligro
  (`ADD COLUMN IF NOT EXISTS`, `DROP PROCEDURE IF EXISTS` + `CREATE`).
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
   ('sp_get_kds_orders','sp_get_orders_admin');"

# Columnas nuevas (debe dar 5)
mysql -u comandapro_user -p -e "
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='DeerCoffeeDB' AND TABLE_NAME='orders'
    AND COLUMN_NAME IN ('sent_at','started_at','ready_at','completed_at','updated_by');"

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

---

## 8. Que cambia (comportamiento, no datos)

| Antes (`c7bc14b`) | Ahora |
|---|---|
| Cobrar cualquier orden `pausada` | El cobro solo se permite en **`lista`/`completada`**; `pausada` -> 409 |
| Sin pantalla de cocina | `/kds` con los estados de la orden y refresco cada 15 s |
| Ordenes no editables fuera de pausada | Cabecera editable por cualquier rol con modulo `pos` (regla H); reemplazar **items** solo Administrador o en `pausada` (409 en el resto) |
| Items sin estado de envio | `order_items.sent` controla que la cocina vea solo lo enviado |

**No cambian:** productos, precios, inventario, proveedores, pagos, turnos,
movimientos de caja ni ordenes ya registradas.

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

---

## 10. Resumen en 6 lineas

```
1. mysqldump + conteos            (respaldo y referencia)
2. git pull                       (codigo y archivos .sql)
3. 018 + sp_simple + sp_transaccionales + sp_lectura   (base, antes de reiniciar)
4. backfill de sent SOLO si hay ordenes activas
5. pnpm build + restart backend
6. health + conteos identicos + prueba de kds/ordenes/cobro
```
