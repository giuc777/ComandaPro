# Manual de Inicio - ComandaPro

## Credenciales de MariaDB

| Usuario | Contraseña | Permisos |
|---------|------------|----------|
| `root` | *(la del sistema)* | Superuser |
| `comandapro_user` | *(ver `back-end/.env` → `DB_PASSWORD`)* | Full access a DB `comandapro` (dev) / `DeerCoffeeDB` (produccion) |

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
"Program Files/MariaDB 11.4/bin/mariadb.exe" -u comandapro_user -p comandapro -e "SELECT 1;"
```

*(se pedirá la contraseña interactivamente)*

## Base de datos

Nombre: `comandapro` (desarrollo) / `DeerCoffeeDB` (produccion)

> En produccion (Raspberry Pi) la base se llama `DeerCoffeeDB`. Ver la guia
> de despliegue en [`../Deploy/README.md`](../Deploy/README.md).

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

Copia la plantilla y rellena los valores reales (el `.env` real está ignorado por git):

```bash
cp back-end/.env.example back-end/.env
```

```env
PORT=3000
DB_HOST=localhost
DB_USER=comandapro_user
DB_PASSWORD=tu_password_aqui
DB_NAME=comandapro

JWT_SECRET=generar_string_aleatorio_largo_aqui
JWT_EXPIRES_IN=15m
# JWT_REFRESH_EXPIRES_IN=7d          # documentado pero NO usado por el código
JWT_REFRESH_EXPIRES_DAYS=7

BCRYPT_WORK_FACTOR=12

# Impresora termica (AON PR-255)
PRINTER_ENABLED=true
PRINTER_INTERFACE=usb            # tcp | usb
PRINTER_HOST=192.168.1.50
PRINTER_PORT=9100
PRINTER_USB=/dev/usb/lp0         # Linux (Raspberry Pi)
PRINTER_WINDOWS_NAME=POS-80C     # Windows: nombre en la impresora
PRINTER_CHARSET=CP850
PRINTER_WIDTH=80                 # mm (80 -> 48 columnas, 58 -> 32)
PRINTER_TIMEOUT_MS=3000
PRINTER_DRY_RUN=false
```

> Para la conexion detallada de la impresora, ver [print.md](print.md).
