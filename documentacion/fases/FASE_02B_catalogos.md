# Fase 2B: Sistema de Catalogos

## Objetivo
Implementar un modulo generico de catalogos que permita administrar grupos de datos (categorias, tipos, tamanos, etc.) utilizados por todo el sistema. Diseno extensible que crece con las necesidades del negocio.

---

## 1. Tablas SQL

- catalog_groups - Grupos de catalogo (Categorias, Bebidas, Tamanos, etc.)
- catalog_items - Items dentro de cada grupo
- Soporte para icon (Material Symbol) y color (hex) en ambos niveles
- Relacion jerarquica via parent_id para sub-items
- Borrado logico (ctive = FALSE) en ambos niveles

Ver: database/migrations/002_fase2_catalogos.sql

---

## 2. Procedimientos Almacenados

| Procedimiento | Descripcion |
|---------------|-------------|
| sp_list_catalog_groups() | Lista grupos activos con conteo de items |
| sp_get_catalog_group(id) | Obtiene grupo por ID |
| sp_create_catalog_group(...) | Crea grupo (name, slug, desc, icon, color, sort) |
| sp_update_catalog_group(...) | Actualiza grupo |
| sp_delete_catalog_group(id) | Soft delete de grupo |
| sp_list_catalog_items_by_group(slug) | Lista items de un grupo por slug |
| sp_get_catalog_item(id) | Obtiene item por ID |
| sp_create_catalog_item(...) | Crea item |
| sp_update_catalog_item(...) | Actualiza item |
| sp_delete_catalog_item(id) | Soft delete de item |
| sp_check_catalog_slug_unique(slug, exclude_id) | Verifica slug unico |

Ver: database/procedures/002_fase2_procedures.sql

---

## 3. Endpoints REST

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| GET | /api/catalogs/groups | Listar grupos activos | Si |
| GET | /api/catalogs/groups/:id | Obtener grupo por ID | Si |
| POST | /api/catalogs/groups | Crear grupo | Admin |
| PUT | /api/catalogs/groups/:id | Actualizar grupo | Admin |
| DELETE | /api/catalogs/groups/:id | Desactivar grupo | Admin |
| GET | /api/catalogs/groups/:slug/items | Listar items de un grupo | Si |
| GET | /api/catalogs/items/:id | Obtener item por ID | Si |
| POST | /api/catalogs/items | Crear item | Admin |
| PUT | /api/catalogs/items/:id | Actualizar item | Admin |
| DELETE | /api/catalogs/items/:id | Desactivar item | Admin |

---

## 4. Archivos Backend

`
back-end/src/
  routes/catalogs.js           # Endpoints de catalogos
  controllers/catalogController.js  # Logica CRUD
  index.js                     # Montado en /api/catalogs
`

---

## 5. Componentes React

`
front-end/src/
  pages/CatalogosPage.jsx          # Vista menu (grid de tarjetas)
  pages/CatalogoDetallePage.jsx    # Vista detalle (tabla CRUD items)
  api/apiClient.js                 # Metodos API de catalogos
  App.jsx                          # Rutas: /catalogos, /catalogos/:slug
`

### Navegacion

`
/catalogos              → Grid de tarjetas con todos los grupos
/catalogos/:slug        → Tabla CRUD de items del grupo seleccionado
`

---

## 6. Datos Semilla

8 grupos de catalogo con 33 items:
- Categorias de Producto (5 items)
- Tipos de Bebida (5 items)
- Tamanos (4 items)
- Metodos de Preparacion (5 items)
- Ingredientes Principales (6 items)
- Menu Cafe (8 items)
- Proveedores (4 items)
- Mesas (8 items)

---

## 7. Criterios de Aceptacion

- [x] Vista menu muestra grid de tarjetas con icono, nombre, descripcion y conteo
- [x] Click en tarjeta navega a /catalogos/:slug
- [x] Vista detalle muestra tabla CRUD de items
- [x] Boton Volver regresa a /catalogos
- [x] Modal para crear/editar grupos
- [x] Modal para crear/editar items
- [x] Eliminacion logica (soft delete)
- [x] Toast de exito/error
- [x] Solo admin puede crear/editar/eliminar
- [x] Items se filtran por slug del grupo
- [x] Sistema extensible: nuevos grupos sin cambiar codigo

---

## 8. Notas de Implementacion

- Arquitectura factory functions (controllers, routes)
- MariaDB driver retorna BigInt para COUNT/LAST_INSERT_ID; se usa helper 	oJSON() para serializar
- El frontend funciona con mock data cuando el backend no esta disponible
- Los grupos se identifican por slug (URL-friendly), no por ID
- Tabla products puede vincularse via category_id FK a catalog_items (futuro)
