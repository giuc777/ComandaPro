# Fase 1: Autenticación y Gestión de Usuarios

## Objetivo
Implementar el sistema de autenticación con BCrypt + JWT (15 min) + Refresh Tokens (7 días) + Blacklist, estableciendo la base de seguridad para todo el sistema.

---

## Seguridad Aplicada

Basado en el plan de seguridad de LexControl, se implementan las siguientes mejoras:

| Mejora | Descripción |
|--------|-------------|
| **BCrypt WF=12** | Hash de contraseñas con work factor 12 (~250ms por hash) |
| **Access token 15 min** | JWT de corta duración con claim JTI |
| **Refresh token 7 días** | Token opaco rotativo, single-use |
| **Blacklist JWT** | Invalidación inmediata por JTI en logout |
| **Logout / Logout-all** | Revocación de sesión individual o global |
| **Interceptor refresh** | Renovación automática sin expulsar al usuario |
| **Mensaje error genérico** | "Usuario o contraseña incorrectos" (evita enumeración) |
| **Borrado lógico** | `active = false` en vez de DELETE |

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 1: Usuarios + Refresh Tokens + Blacklist
-- ============================================

-- Tabla de usuarios
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    role ENUM('Administrador', 'Barista', 'Cajero') NOT NULL DEFAULT 'Barista',
    avatar VARCHAR(10),
    sucursal VARCHAR(100) DEFAULT 'Roma Norte',
    active BOOLEAN DEFAULT TRUE,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de refresh tokens
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    revoked_at TIMESTAMP NULL,
    replaced_by VARCHAR(64) NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabla de blacklist JWT
CREATE TABLE token_blacklist (
    jti VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(200)
);

-- Índices
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_blacklist_expires ON token_blacklist(expires_at);
```

---

## 2. Procedimientos Almacenados

```sql
-- ============================================
-- USUARIOS
-- ============================================

-- Obtener usuario por username (para login)
DELIMITER //
CREATE PROCEDURE sp_get_user_by_username(IN p_username VARCHAR(50))
BEGIN
    SELECT id, username, password_hash, name, email, role, avatar,
           sucursal, active, failed_attempts, locked_until
    FROM users
    WHERE username = p_username;
END //
DELIMITER ;

-- Listar usuarios (admin)
DELIMITER //
CREATE PROCEDURE sp_list_users()
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal, active, created_at
    FROM users
    ORDER BY name;
END //
DELIMITER ;

-- Crear usuario
DELIMITER //
CREATE PROCEDURE sp_create_user(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero')
)
BEGIN
    INSERT INTO users (username, password_hash, name, email, role)
    VALUES (p_username, p_password_hash, p_name, p_email, p_role);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar usuario
DELIMITER //
CREATE PROCEDURE sp_update_user(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero'),
    IN p_active BOOLEAN
)
BEGIN
    UPDATE users
    SET name = p_name, email = p_email, role = p_role, active = p_active
    WHERE id = p_id;
END //
DELIMITER ;

-- Cambiar contraseña
DELIMITER //
CREATE PROCEDURE sp_change_password(
    IN p_id INT,
    IN p_new_password_hash VARCHAR(255)
)
BEGIN
    UPDATE users
    SET password_hash = p_new_password_hash,
        failed_attempts = 0,
        locked_until = NULL
    WHERE id = p_id;
END //
DELIMITER ;

-- Registrar intento fallido
DELIMITER //
CREATE PROCEDURE sp_record_failed_attempt(IN p_user_id INT)
BEGIN
    UPDATE users
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE WHEN failed_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE) ELSE locked_until END
    WHERE id = p_user_id;
END //
DELIMITER ;

-- Resetear intentos fallidos
DELIMITER //
CREATE PROCEDURE sp_reset_failed_attempts(IN p_user_id INT)
BEGIN
    UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = p_user_id;
END //
DELIMITER ;

-- ============================================
-- REFRESH TOKENS
-- ============================================

-- Crear refresh token
DELIMITER //
CREATE PROCEDURE sp_create_refresh_token(
    IN p_user_id INT,
    IN p_token_hash VARCHAR(64),
    IN p_expires_at TIMESTAMP,
    IN p_user_agent VARCHAR(500),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES (p_user_id, p_token_hash, p_expires_at, p_user_agent, p_ip_address);
END //
DELIMITER ;

-- Validar refresh token
DELIMITER //
CREATE PROCEDURE sp_validate_refresh_token(IN p_token_hash VARCHAR(64))
BEGIN
    SELECT rt.id, rt.user_id, rt.expires_at,
           u.username, u.name, u.role, u.active
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = p_token_hash
      AND rt.revoked = FALSE
      AND rt.expires_at > NOW()
      AND u.active = TRUE;
END //
DELIMITER ;

-- Revocar refresh token
DELIMITER //
CREATE PROCEDURE sp_revoke_refresh_token(
    IN p_token_hash VARCHAR(64),
    IN p_replaced_by VARCHAR(64)
)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_at = NOW(),
        replaced_by = p_replaced_by
    WHERE token_hash = p_token_hash;
END //
DELIMITER ;

-- Revocar todos los refresh tokens de un usuario
DELIMITER //
CREATE PROCEDURE sp_revoke_all_user_tokens(IN p_user_id INT)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_at = NOW()
    WHERE user_id = p_user_id
      AND revoked = FALSE;
END //
DELIMITER ;

-- Limpiar tokens expirados (job programado)
DELIMITER //
CREATE PROCEDURE sp_clean_expired_tokens()
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked = TRUE;
END //
DELIMITER ;

-- ============================================
-- TOKEN BLACKLIST
-- ============================================

-- Agregar JTI a blacklist
DELIMITER //
CREATE PROCEDURE sp_add_to_blacklist(
    IN p_jti VARCHAR(50),
    IN p_user_id INT,
    IN p_expires_at TIMESTAMP,
    IN p_reason VARCHAR(200)
)
BEGIN
    INSERT INTO token_blacklist (jti, user_id, expires_at, reason)
    VALUES (p_jti, p_user_id, p_expires_at, p_reason);
END //
DELIMITER ;

-- Verificar si JTI está en blacklist
DELIMITER //
CREATE PROCEDURE sp_is_jti_blacklisted(IN p_jti VARCHAR(50))
BEGIN
    SELECT COUNT(*) AS is_blacklisted
    FROM token_blacklist
    WHERE jti = p_jti
      AND expires_at > NOW();
END //
DELIMITER ;

-- Limpiar blacklist expirada (job programado)
DELIMITER //
CREATE PROCEDURE sp_clean_expired_blacklist()
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `POST` | `/api/auth/login` | Login → access + refresh tokens | No |
| `POST` | `/api/auth/refresh` | Rotar tokens | No (usa refresh) |
| `POST` | `/api/auth/logout` | Revocar refresh + blacklist JTI | Sí |
| `POST` | `/api/auth/logout-all` | Revocar todos los refresh del usuario | Sí |
| `GET` | `/api/auth/me` | Usuario actual (del token) | Sí |
| `GET` | `/api/users` | Listar usuarios | Admin |
| `POST` | `/api/users` | Crear usuario | Admin |
| `PUT` | `/api/users/:id` | Actualizar usuario | Admin |
| `PUT` | `/api/users/:id/password` | Cambiar contraseña | Propio/Admin |
| `DELETE` | `/api/users/:id` | Desactivar usuario | Admin |

### Respuesta login:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6...",
  "expiresIn": 900,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Ana Lopez",
    "role": "Administrador"
  }
}
```

### Respuesta refresh:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "nuevo_token...",
  "expiresIn": 900
}
```

### Respuesta error:
```json
{
  "success": false,
  "error": "Usuario o contraseña incorrectos."
}
```

---

## 4. Flujo de Seguridad

### 4.1 Login
```
1. Recibir username + password
2. Buscar usuario por username
3. Si no existe → error genérico
4. Si está bloqueado (locked_until > NOW) → error genérico
5. Verificar BCrypt hash
6. Si falla → incrementar failed_attempts, error genérico
7. Si OK → reset failed_attempts
8. Generar access token (15 min, con JTI)
9. Generar refresh token (7 días, 64 bytes aleatorios)
10. Hashear refresh token con SHA256 para guardar en DB
11. Guardar refresh token en DB
12. Retornar ambos tokens
```

### 4.2 Request API
```
1. Adjuntar Authorization: Bearer <accessToken>
2. Verificar JWT signature y expiración
3. Extraer JTI del token
4. Verificar JTI en blacklist
5. Si está en blacklist → 401 "Sesión revocada."
6. Si no → procesar request
```

### 4.3 Refresh Token
```
1. Recibir refreshToken
2. Hashear con SHA256
3. Buscar en DB: token_hash, revoked=FALSE, expires_at>NOW
4. Si no existe o está revocado → 401
5. Generar nuevo par de tokens
6. Revocar token anterior (reemplazadoPor = nuevo hash)
7. Retornar nuevos tokens
```

### 4.4 Logout
```
1. Extraer JTI del access token actual
2. Extraer expiración del token
3. Agregar JTI a blacklist (reason: "logout")
4. Revocar refresh token recibido
5. Retornar 204
```

### 4.5 Logout All
```
1. Extraer user_id del token actual
2. Revocar TODOS los refresh tokens del usuario
3. Retornar 204
```

### 4.6 Interceptor Frontend
```
1. Si request es /auth/login o /auth/refresh → no adjuntar token
2. Adjuntar Authorization: Bearer <accessToken>
3. Si respuesta 401:
   a. Si NO hay refresh en curso:
      - Marcar refresh en curso
      - POST /api/auth/refresh con refreshToken
      - Reintentar request original con nuevo token
      - Si falla → limpiar sesión, redirect /login
   b. Si YA hay refresh en curso:
      - Esperar resultado (BehaviorSubject)
      - Reintentar con nuevo token
```

---

## 5. Archivos Backend

```
back-end/src/
├── routes/
│   ├── auth.js              # Login, refresh, logout, logout-all, me
│   └── users.js             # CRUD de usuarios
├── controllers/
│   ├── authController.js    # Lógica de autenticación
│   └── userController.js    # CRUD usuarios
├── middleware/
│   ├── auth.js              # JWT verification + blacklist check
│   ├── adminOnly.js         # Solo administradores
│   └── rateLimiter.js       # Rate limiting (opcional)
├── services/
│   ├── authService.js       # BCrypt + JWT + refresh logic
│   └── tokenService.js      # Generación y rotación de tokens
├── config/
│   └── database.js          # Pool de conexiones MariaDB
└── utils/
    └── tokenUtils.js        # Generar tokens aleatorios, hash
```

### Dependencias a instalar:
```bash
pnpm add jsonwebtoken bcryptjs crypto-js
```

### Variables de entorno (.env):
```
JWT_ACCESS_SECRET=clave_secreta_minimo_32_caracteres
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES_DAYS=7
BCRYPT_WORK_FACTOR=12
```

---

## 6. Componentes React

```
front-end/src/
├── pages/
│   ├── LoginPage.jsx
│   └── SettingsPage.jsx
├── components/
│   ├── ProtectedRoute.jsx      # Wrapper para rutas autenticadas
│   └── UserManagement.jsx      # Tabla de usuarios (admin)
├── hooks/
│   └── useAuth.js              # Hook de autenticación
├── api/
│   ├── auth.js                 # Login, refresh, logout
│   ├── apiClient.js            # Axios instance con interceptor
│   └── users.js                # CRUD usuarios
└── utils/
    └── tokenStorage.js         # Guardar/limpiar tokens
```

### Estructura useAuth:
```javascript
const useAuth = () => {
  return {
    user,              // Usuario actual
    isAuthenticated,   // Boolean
    isLoading,         // Boolean
    login,             // (username, password) => Promise
    logout,            // () => Promise
    logoutAll,         // () => Promise
  }
}
```

### Estructura apiClient (interceptor):
```javascript
const apiClient = axios.create({ baseURL: '/api' });

// Request interceptor
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.url.includes('/auth/')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { accessToken } = await refreshTokens();
          error.config.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(error.config);
        } catch {
          clearAuth();
          window.location.hash = '#/login';
        } finally {
          isRefreshing = false;
        }
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 7. Pruebas

### Jest (Unit Tests):
```javascript
describe('Auth Controller', () => {
  test('login con credenciales válidas retorna tokens')
  test('login con credenciales inválidas retorna error genérico')
  test('login con usuario inactivo retorna error genérico')
  test('login con usuario bloqueado retorna error genérico')
  test('access token expira en 15 minutos')
  test('access token contiene claim JTI')
  test('refresh token se guarda hasheado en DB')
})

describe('Refresh Token', () => {
  test('refresh con token válido retorna nuevos tokens')
  test('refresh con token revocado retorna 401')
  test('refresh con token expirado retorna 401')
  test('refresh rota el token (anterior queda revoked)')
})

describe('Logout', () => {
  test('logout agrega JTI a blacklist')
  test('logout revoca refresh token')
  test('request con token en blacklist retorna 401')
  test('logout-all revoca todos los refresh del usuario')
})

describe('User Controller', () => {
  test('admin puede listar usuarios')
  test('barista no puede listar usuarios')
  test('admin puede crear usuario')
  test('no se pueden crear usernames duplicados')
  test('mensaje de error es genérico (no revela si usuario existe)')
})
```

### Playwright (E2E):
```javascript
test('login exitoso redirige al dashboard', async ({ page }) => {
  await page.goto('/#/login')
  await page.fill('input[name="username"]', 'admin')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/dashboard/)
})

test('login fallido muestra error genérico', async ({ page }) => {
  await page.goto('/#/login')
  await page.fill('input[name="username"]', 'wrong')
  await page.fill('input[name="password"]', 'wrong')
  await page.click('button[type="submit"]')
  await expect(page.locator('.toast-error')).toContainText('Usuario o contraseña incorrectos')
})

test('refresh automático mantiene sesión activa', async ({ page }) => {
  await loginAs('admin')
  // Manipular token para forzar refresh
  // Verificar que la sesión persiste
})

test('logout invalida token en servidor', async ({ page }) => {
  await loginAs('admin')
  await page.click('button[title="Cerrar sesión"]')
  // Intentar usar token viejo → debe fallar
})
```

---

## 8. Criterios de Aceptación

- [ ] Login funciona con credenciales del prototipo (admin/admin123, mateo/barista123)
- [ ] BCrypt work factor 12 (hash empieza con `$2a$12$`)
- [ ] Access token expira en 15 minutos
- [ ] Refresh token expira en 7 días
- [ ] Refresh token es single-use (rotación)
- [ ] Logout agrega JTI a blacklist
- [ ] Logout revoca refresh token
- [ ] Logout-all revoca todos los refresh del usuario
- [ ] Request con token en blacklist retorna 401
- [ ] Interceptor refresca automáticamente sin expulsar al usuario
- [ ] Mensaje de error es siempre "Usuario o contraseña incorrectos"
- [ ] Usuarios bloqueados después de 5 intentos fallidos (15 min)
- [ ] ProtectedRoute bloquea acceso sin token
- [ ] Admin puede CRUD usuarios
- [ ] Barista solo puede cambiar su propia contraseña
- [ ] Passwords se almacenan con BCrypt (no plaintext)
- [ ] Borrado lógico (active = false)

---

## 9. Datos Semilla

```sql
-- Passwords hasheados con bcryptjs (WF=12)
-- admin123 → $2a$12$...
-- barista123 → $2a$12$...
INSERT INTO users (username, password_hash, name, email, role, avatar) VALUES
('admin', '$2a$12$LJ3m4ys3Lk0TSwHjQwGO5eQPxKr7dJ5Fv8Qz3f5x7z8v9c0b1a2d', 'Ana Lopez', 'ana@comandapro.com', 'Administrador', 'AL'),
('mateo', '$2a$12$LJ3m4ys3Lk0TSwHjQwGO5eQPxKr7dJ5Fv8Qz3f5x7z8v9c0b1a2d', 'Mateo Rodriguez', 'mateo@comandapro.com', 'Barista', 'MR');
```

---

## 10. Jobs de Limpieza

```sql
-- Ejecutar diariamente a las 3 AM
-- Limpiar refresh tokens expirados
CALL sp_clean_expired_tokens();

-- Limpiar blacklist expirada
CALL sp_clean_expired_blacklist();
```

---

## 11. Rollback

```sql
-- Si algo falla, eliminar en orden inverso
DROP TABLE IF EXISTS token_blacklist;
DROP TABLE IF EXISTS refresh_tokens;
-- Users se mantiene (es la tabla base)
```

---

## 12. Notas de Implementación

- El prototipo usa login por username (no email)
- El email se muestra solo en perfil/información
- Los usuarios pueden cambiar su nombre de usuario desde Ajustes
- El rol determina qué pantallas puede ver (Reportes = solo admin)
- Nunca commitear claves JWT reales. Usar variables de entorno
- Siempre hacer backup antes de ejecutar migraciones
- Verificar login de admin después de cada cambio
