# ComandaPro - Documentación de Desarrollo

## Índice de Fases

| Fase | Nombre | Estado | Dependencias |
|------|--------|--------|--------------|
| [FASE 01](fases/FASE_01_auth_usuarios.md) | Autenticación y Usuarios | ⬜ Pendiente | — |
| [FASE 02](fases/FASE_02_productos_categorias.md) | Productos y Categorías | ⬜ Pendiente | FASE 01 |
| [FASE 02B](fases/FASE_02B_catalogos.md) | Sistema de Catálogos | ✅ Completada | FASE 01 |
| [FASE 03](fases/FASE_03_modificadores.md) | Sistema de Modificadores | ⬜ Pendiente | FASE 02 |
| [FASE 04](fases/FASE_04_ordenes_pos.md) | Órdenes y Terminal POS | ⬜ Pendiente | FASE 02, 03 |
| [FASE 05](fases/FASE_05_kds_cocina.md) | Kitchen Display System | 🚧 Próximamente (fuera de alcance) | FASE 04 |
| [FASE 06](fases/FASE_06_pagos_recibos.md) | Pagos y Recibos | ⬜ Pendiente | FASE 04 |
| [FASE 07](fases/FASE_07_inventario_recetas.md) | Inventario y Recetas | ⬜ Pendiente | FASE 02, **04, 06** |
| [FASE 08](fases/FASE_08_proveedores.md) | Proveedores | ⬜ Pendiente | FASE 07 |
| [FASE 09](fases/FASE_09_mesas.md) | Mesas | ⬜ Pendiente | FASE 04 |
| [FASE 10](fases/FASE_10_turnos_caja.md) | Turnos y Caja | ⬜ Pendiente | FASE 06 |
| [FASE 11](fases/FASE_11_reportes_analytics.md) | Reportes y Analíticas | ⬜ Pendiente | FASE 06, 10 |
| [FASE 12](fases/FASE_12_testing_deploy.md) | Testing E2E y Deploy | ⬜ Pendiente | Todas |

---

## Orden de Ejecución

```
Fase 1 (Auth)
    │
    ├──→ Fase 2 (Productos)
    │        │
    │        ├──→ Fase 2B (Catálogos) ✅
    │        │
    │        └──→ Fase 3 (Modificadores)
    │                 │
    │                 └──→ Fase 4 (Órdenes POS)
    │                          │
    │                          ├──→ Fase 5 (KDS) 🚧 Próximamente
    │                          ├──→ Fase 6 (Pagos)
    │                          │        │
    │                          │        ├──→ Fase 7 (Inventario + Recetas)
    │                          │        │        │
    │                          │        │        └──→ Fase 8 (Proveedores)
    │                          │        │
    │                          │        └──→ Fase 10 (Turnos)
    │                          │                 │
    │                          │                 └──→ Fase 11 (Reportes)
    │                          │
    │                          └──→ Fase 9 (Mesas)
    │
    └──→ Fase 12 (Testing + Deploy)
```

> **Nota:** Fase 7 (Inventario + Recetas) depende de Fase 4 (Órdenes) y Fase 6
> (Pagos) porque la deducción de inventario es **obligatoria y automática** al
> cobrar, ejecutándose dentro de la transacción de pago.

> **Nota (flujo actual sin KDS):** Fase 5 (KDS) queda **fuera de alcance por
> ahora** y la página se muestra como "Próximamente". Mientras tanto, el POS
> **no envía órdenes a cocina**: las **pausa** (status `pausada`) con nombre de
> cliente y mesa, se listan para su identificación y luego se **cobran
> manualmente** (Fase 6). Ver FASE_04 para el detalle.

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
