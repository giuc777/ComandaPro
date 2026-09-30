# ComandaPro - Documentación de Desarrollo

> **Manual de usuario:** [ManualDeUsuario.md](ManualDeUsuario.md) — guía
> práctica del sistema (login, POS, caja, productos, reportes).

## Índice de Fases

| Fase | Nombre | Estado | Dependencias |
|------|--------|--------|--------------|
| [FASE 01](fases/FASE_01_auth_usuarios.md) | Autenticación y Usuarios | ✅ Completada | — |
| [FASE 02](fases/FASE_02_productos_categorias.md) | Productos y Categorías | ✅ Completada | FASE 01 |
| [FASE 02B](fases/FASE_02B_catalogos.md) | Sistema de Catálogos | ✅ Completada | FASE 01 |
| [FASE 03](fases/FASE_03_modificadores.md) | Sistema de Modificadores | ✅ Completada | FASE 02 |
| [FASE 04](fases/FASE_04_ordenes_pos.md) | Órdenes y Terminal POS | ✅ Completada | FASE 02, 03 |
| [FASE 05](fases/FASE_05_kds_cocina.md) | Kitchen Display System (implementación) | 🔄 En curso (A-D + H + F.3 + F.1/F.2 + G.1/G.2 ✅ · prueba manual pendiente) | FASE 04, 06 |
| [FASE 06](fases/FASE_06_pagos_recibos.md) | Pagos y Recibos | ✅ Completada | FASE 04 |
| [FASE 07](fases/FASE_07_inventario_recetas.md) | Inventario y Recetas | ✅ Completada | FASE 02, 04, 06 |
| [FASE 08](fases/FASE_08_proveedores.md) | Proveedores | ✅ Completada | FASE 07 |
| [FASE 09](fases/FASE_09_mesas.md) | Mesas | ✅ Completada | FASE 04 |
| [FASE 10](fases/FASE_10_turnos_caja.md) | Turnos y Caja | ✅ Completada | FASE 06 |
| [FASE 11](fases/FASE_11_reportes_analytics.md) | Reportes y Analíticas | ✅ Completada | FASE 06, 10 |
| [FASE 12](fases/FASE_12_testing_deploy.md) | Testing E2E y Deploy | ⬜ Pendiente | Todas |
| [FASE 13](fases/FASE_13_impresion_termica.md) | Impresion Termica | ✅ Completada | FASE 06 |
| [FASE 14](fases/FASE_14_usuarios_permisos.md) | Usuarios, Permisos y Sucursal | ✅ Completada | FASE 01 |
| [FASE 15](fases/FASE_15_ordenes_admin.md) | Pantalla de Órdenes del Administrador (implementación) | 🔄 En curso (sub-fases A-B ✅ · E ✅) | FASE 04, 05 |

> Para la conexion de la impresora termica, ver [print.md](print.md).

---

## Orden de Ejecución

```
Fase 1 (Auth)
    │
    └──→ Fase 2 (Productos)
             │
             ├──→ Fase 2B (Catálogos + Modificadores) ✅
             ├──→ Fase 3 (Modificadores unificados) ✅
             │
             └──→ Fase 4 (Órdenes POS) ✅
                      │
                        ├──→ Fase 5 (KDS) 🔄 A-D + H + F.3 + F.1/F.2 + G.1/G.2 ✅ · manual pendiente
                       │        │
                       │        └──→ Fase 15 (Órdenes del Admin) ✅ A-B + E
                       ├──→ Fase 6 (Pagos) ✅
                      │        │
                       │        ├──→ Fase 7 (Inventario + Recetas) ✅
                        │        │        │
                        │        │        └──→ Fase 8 (Proveedores) ✅
                      │        │
                       │        └──→ Fase 10 (Turnos) ✅
                       │                 │
                       │                 └──→ Fase 11 (Reportes) ✅
                      │
                       └──→ Fase 9 (Mesas) ✅

Fase 12 (Testing + Deploy) — requiere todas las fases
```

> **Nota:** Los modificadores (extras de precio, grupos requeridos, etc.) se
> gestionan dentro de Fase 2B (Catálogos) — ver `is_modifier` en `catalog_groups`.
> La tabla `modifier_groups` fue eliminada; los grupos de modificadores viven en
> `catalog_groups` y se asignan a productos vía `product_modifier_groups`.

> **Nota:** Fase 7 (Inventario + Recetas) depende de Fase 4 (Órdenes) y Fase 6
> (Pagos) porque la deducción de inventario es **obligatoria y automática** al
> cobrar, ejecutándose dentro de la transacción de pago.

> **Nota (plan de cocina y órdenes):** Fase 5 (KDS) y Fase 15 (Órdenes del
> Administrador) están **en implementación por sub-fases**: A (datos), B (backend),
> C (pantalla KDS), **D (POS: enviar a cocina)**, **H (agregar ítems a ordenes en
> curso)**, **F.3 (pantalla de cobro en Caja)**, **E (pantalla `/ordenes` del
> admin, FASE 15)** y **F.1/F.2 (Dashboard)** ya están aplicadas y verificadas;
> la verificación automatizada (**G.1**) y el análisis de impacto en datos
> (**G.2**) también; solo faltan la **prueba manual** y el cierre documental
> (**G.3**) — ver [FASE_05](fases/FASE_05_kds_cocina.md)
> y [FASE_15](fases/FASE_15_ordenes_admin.md).
>
> **Estado actual del flujo:** la máquina de estados y la regla de cobro **ya están
> activas en la base de datos**: el cobro solo se permite en `lista`/`completada`
> (antes era `pausada`), por lo que una orden `pausada` devuelve **409** al cobrarse.
> Con la sub-fase D el POS ya resuelve ese flujo: **"Enviar a Cocina"** marca la orden
> `enviada`, la cocina la mueve a `preparando` → `lista` (visible en el KDS ≤15 s) y
> el panel **"Órdenes en Curso"** habilita **Cobrar** únicamente en
> `lista`/`completada`. Con la sub-fase H el mismo panel permite **Agregar** productos
> a una orden que ya salió (la orden vuelve a `enviada` al reenviarse, la cocina solo
> ve lo enviado y el cobro se bloquea si quedan ítems sin enviar). Con **F.3** la
> pantalla de Caja (`/caja?order=`) muestra el detalle y el formulario de pago en
> `lista`/`completada`, mensajes contextuales en los demás estados (ya no aparece el
> falso *"Esta orden ya fue cobrada"*), avisa si faltan productos por enviar y permite
> **Anular**; el guard de anular pasó del módulo `kds` al **`pos`** (así el Cajero
> también puede anular). Con **E** el administrador tiene la pantalla **`/ordenes`**:
> ve todas las órdenes activas + `completada`, las filtra por estado, las refresca
> cada 15 s y edita cabecera/ítems (los ítems existentes conservan su estado de
> envío; los nuevos nacen `sent=0` y el KDS los muestra como **NUEVO**). Con
> **F.1/F.2** el Dashboard muestra las órdenes en los 4 estados activos (hasta 20,
> ordenadas por última actualización), se refresca solo cada 15 s, conserva los
> datos si falla la carga y da acceso directo a **/ordenes** (admin) y al KDS.
> Pendiente: **G.3** (prueba manual y cierre de FASE 05/15). El flujo anterior
> de "pausar y cobrar manualmente" sigue documentado en FASE_04 hasta F y G.
>
> **Nota (impacto en datos existentes):** todo lo agregado por FASE 05/15 es
> **aditivo**: las migraciones 018/019 solo hacen `ADD COLUMN`/`ADD INDEX`/`ADD
> CONSTRAINT` (nullable) y `DROP/CREATE PROCEDURE`. **No** hay `DROP TABLE`,
> `DELETE`, `TRUNCATE`, `DROP COLUMN` ni `MODIFY COLUMN`, así que productos,
> precios, inventario, pagos, movimientos de turno y órdenes ya cargadas quedan
> intactos; las columnas nuevas valen `NULL`/`0` en el histórico. Los únicos
> cambios son de **lógica para escrituras futuras** (p. ej. `sp_record_payment`
> ya no cobra órdenes `pausada`). Detalle y script de backfill opcional en
> [FASE_05 → G.2](fases/FASE_05_kds_cocina.md).

> **Nota (limpieza de catálogos):** Los grupos `menu_cafe` y `proveedores` fueron
> retirados (soft-delete) por duplicar `products` y `suppliers` respectivamente.
> Ver `database/migrations/014_limpieza_catalogos.sql`. Quedan 9 grupos activos:
> categorías, 4 modificadores (`tamanos`, `tipo_leche`, `temperatura`, `extras`),
> `ingredientes_principales`, `mesas` y 2 catálogos de referencia
> (`tipos_bebida`, `metodos_preparacion`).

> **Nota (receta obligatoria):** Crear o editar un producto exige al menos un
> insumo en su receta. El flujo es `insumo → receta → producto`. Se valida en
> `productController` y se persiste con `sp_set_product_recipe`
> (`database/procedures/012_product_recipe_procedures.sql`).

---

## Ciclo por Fase

Cada fase sigue este proceso:

1. **Tablas SQL** → Crear migración en `database/migrations/`
2. **Procedimientos** → Crear en `database/procedures/`
3. **Endpoints** → Crear routes + controllers en `back-end/src/`
4. **Pruebas API** → Jest unit tests en `back-end/tests/`
5. **Vistas React** → Crear componentes en `front-end/src/`
6. **Pruebas E2E** → Playwright tests en `front-end/tests/`
7. **Documentación** → Actualizar este archivo y el README de la fase

---

## Estructura del Proyecto

```
desarrollo/
├── back-end/                  # Node.js + Express
│   ├── src/
│   │   ├── config/            # Database, env
│   │   ├── controllers/       # Lógica de negocio
│   │   ├── middleware/        # Auth, permissions
│   │   ├── models/            # Queries SQL
│   │   └── routes/            # Endpoints REST
│   ├── tests/                 # Jest tests
│   └── .env
├── front-end/                 # React + Vite
│   ├── src/
│   │   ├── api/               # Funciones de llamada API
│   │   ├── components/        # Componentes reutilizables
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Páginas/rutas
│   │   └── utils/             # Helpers
│   └── tests/                 # Playwright tests
├── database/
│   ├── migrations/            # Scripts SQL por fase
│   ├── procedures/            # Procedimientos almacenados
│   └── seeds/                 # Datos semilla
├── documentacion/
│   ├── fases/                 # Esta carpeta
│   └── README.md              # Este archivo
└── deploy/                    # Configs de producción
```

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 19 + Vite + Tailwind CSS 4 |
| Backend | Node.js + Express 5 |
| Database | MariaDB 11.4 |
| Testing | Jest (unit) + Playwright (E2E) |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Deploy | Nginx + systemd (Raspberry Pi 4) |

---

## Credenciales de Prueba

| Usuario | Username | Contraseña | Rol |
|---------|----------|------------|-----|
| Ana Lopez | `admin` | `admin123` | Administrador |
| Mateo Rodriguez | `mateo` | `barista123` | Barista |

---

## Comandos Rápidos

```bash
# Backend
cd desarrollo/back-end
pnpm dev              # Iniciar servidor desarrollo

# Frontend
cd desarrollo/front-end
pnpm dev              # Iniciar Vite dev server

# Tests
cd desarrollo/front-end
pnpm test             # Ejecutar Playwright
pnpm test:ui          # Interfaz visual de tests

# Database
mariadb -u comandapro_user -p comandapro
SOURCE database/migrations/01_users.sql;
```
