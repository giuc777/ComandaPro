# FASE 14 — Usuarios, Permisos y Sucursal

**Estado:** ✅ Completada
**Dependencias:** FASE 01 (Auth y Usuarios)

---

## Objetivo

Convertir la gestión de usuarios (que era un mockup en `SettingsPage`) en funcionalidad real, y agregar control de acceso por módulos por rol.

### Requerimientos
1. El administrador puede cambiar el nombre de la sucursal.
2. El administrador puede añadir usuarios.
3. El administrador puede imponer qué módulos ve cada rol (p. ej. un cajero o barista no puede ver Catálogos ni añadir Productos).
4. El administrador puede cambiar la contraseña de cualquier usuario.
5. El administrador puede desbloquear usuarios.

---

## Decisiones de diseño

| Tema | Decisión |
|------|----------|
| Granularidad de permisos | Solo visibilidad de **módulos** (no acciones ver/editar). |
| Ubicación UI | Página nueva `/usuarios` (solo admin) con 3 secciones. |
| Sucursal | **Global** (una sola para todo el negocio), editable por admin. |
| Enforcement | **Frontend + backend** (middleware `requireModule`). |

---

## Base de datos

### `migrations/015_usuarios_permisos.sql`
- **`settings`** (`setting_key` PK, `setting_value`, `updated_at`): config global key-value. Semilla `sucursal_nombre = 'Roma Norte'`.
- **`role_permissions`** (`role`, `module_key`, `allowed`, PK compuesta): matriz rol × módulo.

Matriz por defecto:

| Módulo | Administrador | Barista | Cajero |
|--------|:---:|:---:|:---:|
| dashboard, pos, ajustes | ✅ | ✅ | ✅ |
| kds | ✅ | ✅ | ❌ |
| caja | ✅ | ✅ | ✅ |
| productos, inventario, proveedores, catalogos, reportes | ✅ | ❌ | ❌ |

### `procedures/013_user_admin_procedures.sql`
- `sp_list_users_admin` — todos los usuarios (incluye inactivos) con `failed_attempts`, `locked_until`, `is_locked`.
- `sp_get_user_by_id` — perfil por ID (faltaba; `getProfile` estaba roto).
- `sp_update_user` — **redefinido** con `COALESCE` para permitir actualizaciones parciales (antes, pasar `NULL` en nombre rompía el `NOT NULL`).
- `sp_set_user_active` — activar/desactivar.
- `sp_get_settings`, `sp_update_setting`.
- `sp_get_role_permissions`, `sp_set_role_permission`, `sp_get_permissions_for_role`.

---

## Backend

- `userController.js`: corregido el parseo de resultados del driver MariaDB (`rowsOf`/`singleRow`/`toJSON`); nuevos `setPassword` y `unlock`.
- `settingsController.js` + `routes/settings.js`: `GET /api/settings` (auth), `PUT /api/settings` (admin).
- `permissionsController.js` + `routes/permissions.js`: `GET /api/permissions` (admin), `GET /api/permissions/me` (auth), `PUT /api/permissions/:role` (admin). Invalida el cache de permisos al actualizar.
- `middleware/auth.js`: `requireModule(pool, module, { writeOnly })`. Admin siempre pasa; cache de 5 min por rol.
- `authService.js`: `login`/`refresh`/`getProfile` ahora devuelven `permissions` del rol y `sucursal` global. Se implementó `changePassword` (antes no existía → 500).
- `index.js`: montaje de routers y aplicación de `requireModule`:
  - `reportes` → bloquea todo el router (excepto `/reports/dashboard`).
  - `catalogos`, `productos`, `inventario`, `proveedores`, `pos`, `caja` → **bloquea mutaciones** (POST/PUT/DELETE), deja `GET` abierto para no romper POS/KDS.

> Importante: `requireModule` va **después** de `authenticate` en cada `app.use`, porque necesita `req.user`.

---

## Frontend

- `hooks/useAuth.js`: guarda `permissions`, expone `hasModule(key)`, y refresca el perfil al cargar la app.
- `components/ModuleRoute.jsx`: guard de ruta por módulo (generaliza `AdminRoute`).
- `App.jsx`: rutas envueltas en `ModuleRoute` según módulo; nueva ruta `/usuarios`.
- `Sidebar.jsx` / `MobileNav.jsx`: items con `module`; se muestran según permiso; sucursal dinámica; item admin "Usuarios".
- `pages/UsuariosPage.jsx` (admin): secciones **Sucursal**, **Usuarios** (crear/editar/activar/desactivar/cambiar contraseña/desbloquear) y **Permisos por rol** (matriz de toggles).
- `pages/SettingsPage.jsx`: "Cambiar Contraseña" ahora usa `POST /api/auth/change-password`; se eliminó la tarjeta hardcodeada de usuarios.
- `pages/LoginPage.jsx`: sucursal dinámica desde `GET /api/settings`.
- `api/apiClient.js`: métodos `setUserPassword`, `unlockUser`, `changePassword`, `getSettings`, `updateSetting`, `getPermissions`, `updateRolePermissions`, `getMyPermissions`.

---

## Verificación

Suite de 26 pruebas con el servidor real (todas OK):

- Login admin (10 permisos) y barista (5 permisos), sucursal global.
- Crear usuario (201), duplicado (409), cambiar contraseña + login con la nueva.
- Update parcial (nombre cambia, email/rol se conservan).
- Desbloquear usuario; desactivar preservando datos; no auto-desactivarse (400).
- Matriz de permisos (3 roles) y actualización por rol.
- Settings: leer/actualizar/persistir sucursal.
- Enforcement barista: `GET` productos/catálogos 200; `POST` productos/catálogos 403; `GET` reports/daily 403; `GET` reports/dashboard 200; `GET` users 403.

Build frontend OK (640 módulos). Lint sin errores (solo warnings preexistentes de `set-state-in-effect`).

---

## Notas / pendientes

- Los permisos del usuario logueado se refrescan al recargar la app (llamada a `/auth/profile`). El enforcement en backend es inmediato (cache se limpia al guardar).
- El módulo `ajustes` es siempre visible (perfil y cambio de contraseña propio) y no es configurable.
- `usuarios` es siempre solo-admin (no configurable).
- El botón "Usar credenciales de prueba" del login sigue apuntando a `mateo/barista123`.
