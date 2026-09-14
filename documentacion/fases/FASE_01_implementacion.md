# FASE 01 - Auth + Usuarios — Implementación

## Resumen
Autenticación completa con JWT (access + refresh tokens), gestión de usuarios con roles, y seguridad reforzada (BCrypt, blacklist, bloqueo de cuenta).

## Archivos Creados/Modificados

### Base de datos
| Archivo | Contenido |
|---------|-----------|
| `database/migrations/001_fase1_auth.sql` | Tablas: `users`, `refresh_tokens`, `token_blacklist` + índices |
| `database/procedures/001_fase1_procedures.sql` | 12 stored procedures: login, tokens, blacklist, usuarios |
| `database/seed.sql` | 4 usuarios de prueba con BCrypt WF=12 |

### Backend
| Archivo | Descripción |
|---------|-------------|
| `back-end/.env` | Variables de entorno (DB, JWT, BCrypt) |
| `back-end/src/config/database.js` | Pool de conexión MariaDB |
| `back-end/src/config/swagger.js` | Configuración OpenAPI 3.0 |
| `back-end/src/services/tokenService.js` | JWT, BCrypt, refresh tokens, blacklist |
| `back-end/src/services/authService.js` | Login, refresh, logout, perfil |
| `back-end/src/controllers/authController.js` | Endpoints de autenticación |
| `back-end/src/controllers/userController.js` | CRUD de usuarios (admin) |
| `back-end/src/middleware/auth.js` | `authenticate` + `adminOnly` |
| `back-end/src/routes/auth.js` | Rutas de auth con documentación Swagger |
| `back-end/src/routes/users.js` | Rutas de usuarios con documentación Swagger |
| `back-end/src/index.js` | Express + Swagger UI + rutas |

### Frontend
| Archivo | Descripción |
|---------|-------------|
| `front-end/src/api/apiClient.js` | Cliente HTTP con interceptor de refresh token |
| `front-end/src/hooks/useAuth.js` | Hook de autenticación |
| `front-end/src/pages/LoginPage.jsx` | Formulario de login |
| `front-end/src/pages/Dashboard.jsx` | Panel principal post-login |
| `front-end/src/components/ProtectedRoute.jsx` | Ruta protegida |
| `front-end/src/App.jsx` | Router con rutas protegidas |

### Documentación
| Archivo | Contenido |
|---------|-----------|
| `documentacion/Up.md` | Manual de inicio, credenciales, endpoints |

## Endpoints Implementados

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/refresh` | Renovar token | No |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |
| POST | `/api/auth/logout-all` | Cerrar todas las sesiones | Sí |
| GET | `/api/auth/profile` | Ver perfil | Sí |
| POST | `/api/auth/change-password` | Cambiar contraseña | Sí |
| GET | `/api/users` | Listar usuarios | Admin |
| POST | `/api/users` | Crear usuario | Admin |
| PUT | `/api/users/:id` | Actualizar usuario | Admin |
| DELETE | `/api/users/:id` | Desactivar usuario | Admin |

## Seguridad Implementada
- JWT Access Token: 15 min
- JWT Refresh Token: 7 días con rotación
- BCrypt Work Factor: 12
- Bloqueo de cuenta: 5 intentos fallidos → 15 min lockout
- Blacklist de tokens en `token_blacklist`
- Mensajes de error genéricos (no revelar si usuario existe)
- Borrado lógico (nunca DELETE)

## Bugs Corregidos
1. **Conector MariaDB + CALL:** `rows[0]?.[0]` → `rows[0]` (5 archivos afectados)
2. **Puerto Swagger:** Server URL estaba en `:3001`, backend corre en `:3000`
3. **Vite Proxy:** Apuntaba a `:3001`, corregido a `:3000`

## Para Ejecutar
```bash
# Backend
cd desarrollo/back-end
pnpm dev

# Frontend
cd desarrollo/front-end
pnpm dev

# Swagger UI
http://localhost:3000/api-docs
```

## Credenciales de Prueba
| Usuario | Contraseña | Rol |
|---------|------------|-----|
| admin | admin123 | Administrador |
| mateo | barista123 | Barista |
| lucia | barista123 | Barista |
| carlos | barista123 | Cajero |
