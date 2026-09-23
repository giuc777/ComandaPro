# Database - DeerCoffee

## Estructura

### Fase 0 - Configuración Inicial
- `01_create_users_table.sql` - Tabla de usuarios
- `02_create_initial_tables.sql` - Tablas principales (products, orders, inventory, etc.)
- `03_seed_data.sql` - Datos semilla iniciales
- `04_create_procedures.sql` - Procedimientos almacenados Fase 0

### Fase 2B - Catálogos
- `migrations/002_fase2_catalogos.sql` - Tablas catalog_groups + catalog_items + seed
- `procedures/002_fase2_procedures.sql` - 11 procedimientos de catálogos
- `seed_002.sql` - Datos de 8 grupos + 33 items

## Ejecución

```bash
# Conectar a MariaDB
mariadb -u root -p comandapro

# Fase 0
SOURCE 01_create_users_table.sql;
SOURCE 02_create_initial_tables.sql;
SOURCE 03_seed_data.sql;
SOURCE 04_create_procedures.sql;

# Fase 2B - Catálogos
SOURCE migrations/002_fase2_catalogos.sql;
SOURCE procedures/002_fase2_procedures.sql;
SOURCE seed_002.sql;
```

## Diagrama de Tablas

```
users ─────────┐
               │
orders ────────┼── order_items ──── products ──── recipes ──── inventory
               │                      │
payments ──────┘                      └─── catalog_items ──── catalog_groups
               
shifts ──────── shift_transactions

suppliers (independiente)

tables (independiente, se conecta con orders)

catalog_groups ──── catalog_items (FK group_id, self-ref parent_id)
```

## Tablas Catálogos

| Tabla | Descripción |
|-------|-------------|
| `catalog_groups` | Grupos de catálogo (Categorías, Tipos de Bebida, Tamaños, etc.) |
| `catalog_items` | Items dentro de cada grupo, con soporte jerárquico |

**Campos especiales:** `icon` (Material Symbol), `color` (hex #RRGGBB), `sort_order`

## Procedimientos Almacenados

### Fase 0
- `sp_get_user_by_email` - Login
- `sp_create_user` - Crear usuario
- `sp_list_users` - Listar usuarios
- `sp_update_user` - Actualizar usuario
- `sp_delete_user` - Eliminar usuario
- `sp_get_user_stats` - Estadísticas de usuario

### Fase 2B - Catálogos
- `sp_list_catalog_groups` - Listar grupos con conteo
- `sp_get_catalog_group` - Obtener grupo
- `sp_create_catalog_group` - Crear grupo
- `sp_update_catalog_group` - Actualizar grupo
- `sp_delete_catalog_group` - Soft delete grupo
- `sp_list_catalog_items_by_group` - Items por slug
- `sp_get_catalog_item` - Obtener item
- `sp_create_catalog_item` - Crear item
- `sp_update_catalog_item` - Actualizar item
- `sp_delete_catalog_item` - Soft delete item
- `sp_check_catalog_slug_unique` - Verificar slug

### Fase 14 - Usuarios, Permisos y Sucursal
- `migrations/015_usuarios_permisos.sql` - Tablas `settings` + `role_permissions` (con semilla de sucursal y matriz de permisos)
- `procedures/013_user_admin_procedures.sql`:
  - `sp_list_users_admin` - Listar todos los usuarios (incluye inactivos/bloqueados)
  - `sp_get_user_by_id` - Perfil por ID
  - `sp_update_user` - Actualización parcial (redefinido con `COALESCE`)
  - `sp_set_user_active` - Activar/desactivar
  - `sp_get_settings` / `sp_update_setting` - Configuración global
  - `sp_get_role_permissions` / `sp_set_role_permission` / `sp_get_permissions_for_role` - Permisos por rol

**Tablas nuevas:**

| Tabla | Descripción |
|-------|-------------|
| `settings` | Configuración global key-value (p. ej. `sucursal_nombre`) |
| `role_permissions` | Matriz `role` × `module_key` → `allowed` |
