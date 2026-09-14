# Manual de Inicio - ComandaPro

## Credenciales de MariaDB

| Usuario | Contraseña | Permisos |
|---------|------------|----------|
| `root` | `Di0sm34m4` | Superuser |
| `comandapro_user` | `ComandaPro_2024!` | Full access a DB `comandapro` |

## Credenciales de la Aplicación

| Usuario | Contraseña | Rol |
|---------|------------|-----|
| `admin` | `admin123` | Administrador |
| `mateo` | `barista123` | Barista |
| `lucia` | `barista123` | Barista |
| `carlos` | `barista123` | Cajero |

## Arranque de Servicios

### 1. Backend (Express + Node.js)

```bash
cd desarrollo/back-end
pnpm dev
```

El servidor arranca en `http://localhost:3001`

### 2. Frontend (Vite + React)

```bash
cd desarrollo/front-end
pnpm dev
```

El frontend arranca en `http://localhost:5173`

### 3. MariaDB

El servicio de MariaDB debe estar corriendo en `localhost:3306`.

Verificar estado:
```bash
"Program Files/MariaDB 11.4/bin/mariadb.exe" -u comandapro_user -p'ComandaPro_2024!' comandapro -e "SELECT 1;"
```

## Base de datos

Nombre: `comandapro`

### Migraciones ejecutadas

| Archivo | Contenido |
|---------|-----------|
| `database/migrations/001_fase1_auth.sql` | Tablas: `users`, `refresh_tokens`, `token_blacklist` + índices |
| `database/procedures/001_fase1_procedures.sql` | Stored procedures: login, tokens, blacklist, usuarios |
| `database/seed.sql` | 4 usuarios de prueba con contraseñas hasheadas (BCrypt WF=12) |

## Endpoints Disponibles (FASE 01)

### Auth

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/login` | Iniciar sesión | No |
| POST | `/api/auth/refresh` | Renovar token | No |
| POST | `/api/auth/logout` | Cerrar sesión | Sí |
| POST | `/api/auth/logout-all` | Cerrar todas las sesiones | Sí |
| GET | `/api/auth/profile` | Ver perfil | Sí |
| POST | `/api/auth/change-password` | Cambiar contraseña | Sí |

### Usuarios (Admin)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/users` | Listar usuarios | Admin |
| POST | `/api/users` | Crear usuario | Admin |
| PUT | `/api/users/:id` | Actualizar usuario | Admin |
| DELETE | `/api/users/:id` | Desactivar usuario | Admin |

### Health Check

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| GET | `/api/health` | Estado del servidor | No |

## Configuración de Seguridad

- **JWT Access Token:** 15 minutos
- **JWT Refresh Token:** 7 días (con rotación)
- **BCrypt Work Factor:** 12
- **Bloqueo de cuenta:** 5 intentos fallidos → 15 min de bloqueo
- **Blacklist:** Tokens revocados se almacenan en `token_blacklist`

## Variables de Entorno (back-end/.env)

```env
PORT=3001
DB_HOST=localhost
DB_USER=comandapro_user
DB_PASSWORD=ComandaPro_2024!
DB_NAME=comandapro

JWT_SECRET=comandapro_jwt_secret_2024_very_secure_random_string
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_DAYS=7

BCRYPT_WORK_FACTOR=12
```
