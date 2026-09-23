# Guia de Despliegue - ComandaPro (Raspberry Pi)

Guia completa para instalar y configurar **DeerCoffee / ComandaPro** en una
Raspberry Pi que actuara como servidor (backend + base de datos + frontend).

> **Importante:** este documento usa **valores de ejemplo**. Nunca subas a git
> contraseñas reales ni el `JWT_SECRET`. Los archivos `.env` reales estan
> ignorados por `.gitignore`; usa `back-end/.env.example` como plantilla.

---

## 1. Arquitectura

```
        Tablets / PCs / Pantalla (navegador)
                     |
                     |  http://<IP_RASPBERRY>/
                     v
        +-------------------------------+
        |         Raspberry Pi          |
        |                               |
        |  nginx (puerto 80)            |
        |    - sirve el frontend (dist) |
        |    - proxy /api -> :3000      |
        |                               |
        |  Node.js / Express (:3000)    |
        |    - API REST /api/*          |
        |    - Swagger /api-docs        |
        |                               |
        |  MariaDB 11.4 (:3306)         |
        |    - base de datos comandapro |
        +-------------------------------+
                     |
                     |  TCP 9100  o  USB
                     v
              Impresora termica ESC/POS (AON PR-255)
```

- **Backend:** Node.js 22 + Express 5 (puerto configurable con `PORT`).
- **Frontend:** Vite + React 19, compilado a estaticos (`dist/`).
- **Base de datos:** MariaDB 11.4, base `comandapro`.
- **Impresion:** ver [`../documentacion/print.md`](../documentacion/print.md).

---

## 2. Requisitos

### Hardware
- Raspberry Pi 4 (recomendado 4 GB) o superior.
- Tarjeta microSD de 16 GB+ (clase 10).
- Fuente de alimentacion oficial.
- Impresora termica AON PR-255 (o compatible ESC/POS).

### Software
- Raspberry Pi OS 64-bit (Bookworm o superior).
- Node.js 22 LTS.
- pnpm 12+.
- MariaDB 11.4.
- nginx.

---

## 3. Preparar la Raspberry Pi

1. Graba Raspberry Pi OS 64-bit con Raspberry Pi Imager.
2. En Imager (opcion avanzada) configura: hostname, usuario, WiFi/red y SSH.
3. Actualiza el sistema:

```bash
sudo apt update && sudo apt full-upgrade -y
```

4. Configura un **hostname** y una **IP fija** (por DHCP reservado en el router o
   por `nmcli`/`dhcpcd`), por ejemplo `192.168.1.10`.

```bash
sudo raspi-config
# System Options > Hostname  -> comandapro
# Interface Options > SSH    -> Enable
```

5. Reinicia:

```bash
sudo reboot
```

---

## 4. Instalar Node.js 22 y pnpm

```bash
# Node.js 22 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node --version   # v22.x
```

```bash
# pnpm
sudo corepack enable
corepack prepare pnpm@latest --activate
# o bien: npm install -g pnpm

pnpm --version   # 12.x
```

---

## 5. Instalar MariaDB 11.4

```bash
sudo apt install -y mariadb-server
sudo mysql_secure_installation
```

Habilita el servicio al arranque:

```bash
sudo systemctl enable --now mariadb
```

### 5.1 Crear el usuario de la aplicacion

Entra como root de MariaDB:

```bash
sudo mariadb
```

Ejecuta (cambia la contrasena por una fuerte; **no** la subas a git):

```sql
CREATE USER 'comandapro_user'@'localhost' IDENTIFIED BY 'CAMBIA_ESTA_PASSWORD';
CREATE DATABASE IF NOT EXISTS `comandapro` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON `comandapro`.* TO 'comandapro_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> El `schema.sql` hace `CREATE DATABASE IF NOT EXISTS`, por lo que el usuario
> necesita permisos sobre la base (ya otorgados arriba) o crear la base antes.

---

## 6. Desplegar la base de datos

El paquete de instalacion esta en esta misma carpeta:

```
Deploy/
  Produccion/     <- datos iniciales SIN transacciones (recomendado para produccion)
    schema.sql
    sp_lectura.sql
    sp_simple.sql
    sp_transaccionales.sql
    seed.sql
  Test/           <- datos DEMO (ordenes, pagos, turnos, compras) para pruebas
    ...
```

**Orden obligatorio de ejecucion:**

```bash
cd Deploy/Produccion        # o Deploy/Test

mysql -u comandapro_user -p comandapro < schema.sql
mysql -u comandapro_user -p comandapro < sp_lectura.sql
mysql -u comandapro_user -p comandapro < sp_simple.sql
mysql -u comandapro_user -p comandapro < sp_transaccionales.sql
mysql -u comandapro_user -p comandapro < seed.sql
```

Verifica:

```bash
mysql -u comandapro_user -p comandapro -e "SHOW TABLES;"
mysql -u comandapro_user -p comandapro -e "SELECT COUNT(*) FROM users;"
```

### 6.1 Usuarios iniciales (seed)

| Usuario  | Contrasena | Rol           |
|----------|------------|---------------|
| `admin`  | `admin123` | Administrador |
| `mateo`  | `barista123`| Barista       |
| `carlos` | `barista123`| Cajero        |

> **Cambia estas contrasenas** desde la app (o con el endpoint
> `POST /api/auth/change-password`) despues del primer ingreso.

### 6.2 Migraciones incrementales

`Deploy/*` representa el estado **completo** de la base (no hace falta correr
`database/migrations/*`). Esas migraciones son solo para bases ya existentes en
desarrollo.

---

## 7. Configurar el backend

```bash
cd back-end
cp .env.example .env
```

Edita `back-end/.env`:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_USER=comandapro_user
DB_PASSWORD=CAMBIA_ESTA_PASSWORD
DB_NAME=comandapro

JWT_SECRET=GENERA_UN_STRING_ALEATORIO_LARGO
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_DAYS=7

BCRYPT_WORK_FACTOR=12

PRINTER_ENABLED=true
PRINTER_INTERFACE=tcp            # tcp | usb
PRINTER_HOST=192.168.1.50
PRINTER_PORT=9100
PRINTER_USB=/dev/usb/lp0
PRINTER_WINDOWS_NAME=
PRINTER_CHARSET=CP850
PRINTER_WIDTH=80
PRINTER_TIMEOUT_MS=3000
PRINTER_DRY_RUN=false
```

Genera un `JWT_SECRET` seguro:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Instala dependencias y prueba:

```bash
pnpm install
pnpm start        # o: pnpm dev  (con recarga automatica)
```

Comprueba:

```bash
curl http://localhost:3000/api/health
# {"status":"ok", ...}
```

---

## 8. Compilar y servir el frontend

### 8.1 Ajustar la URL del API (IMPORTANTE)

`front-end/src/api/apiClient.js` apunta por defecto a
`http://localhost:3000/api`. Si los navegadores acceden desde **otro equipo**
(tablet, PC), `localhost` apuntaria al propio dispositivo, no a la Raspberry.

Recomendado: servir el frontend y el API bajo el **mismo origen** con nginx y
usar una ruta **relativa**:

1. En `front-end/src/api/apiClient.js` cambia:

```js
// const API_BASE = 'http://localhost:3000/api';
const API_BASE = '/api';
```

2. Y la URL de imagenes (misma archivo, funcion de subida de productos):

```js
// return `http://localhost:3000/uploads/products/${filename}`;
return `/uploads/products/${filename}`;
```

Alternativa rapida (sin proxy): apunta directamente a la IP de la Pi:

```js
const API_BASE = 'http://192.168.1.10:3000/api';
```

### 8.2 Build

```bash
cd front-end
pnpm install
pnpm build          # genera front-end/dist/
```

### 8.3 nginx

```bash
sudo apt install -y nginx
```

Crea `/etc/nginx/sites-available/comandapro`:

```nginx
server {
    listen 80;
    server_name _;

    root /home/pi/desarrollo/front-end/dist;
    index index.html;

    # SPA (React Router): redirigir rutas al index
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API -> backend Node
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Archivos subidos (imagenes de productos)
    location /uploads/ {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/comandapro /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

> Ajusta `root` a la ruta real del proyecto en la Pi.

---

## 9. Servicios systemd (arranque automatico)

### 9.1 Backend

Crea `/etc/systemd/system/comandapro-backend.service`:

```ini
[Unit]
Description=ComandaPro Backend (Express)
After=network.target mariadb.service
Wants=mariadb.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/desarrollo/back-end
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now comandapro-backend
sudo systemctl status comandapro-backend
```

> El backend lee `back-end/.env` automaticamente (dotenv), no necesitas
> declarar variables en el unit.

### 9.2 Ver logs

```bash
journalctl -u comandapro-backend -f
```

---

## 10. Impresora termica

La guia detallada (red, USB en Linux, spooler Windows) esta en
[`../documentacion/print.md`](../documentacion/print.md).

Resumen rapido:

- **Por red (recomendado):** `PRINTER_INTERFACE=tcp`, `PRINTER_HOST=<IP_IMPRESORA>`,
  `PRINTER_PORT=9100`.
- **Por USB en la Pi:** `PRINTER_INTERFACE=usb`, `PRINTER_USB=/dev/usb/lp0` y
  agregar el usuario al grupo `lp`:

```bash
sudo usermod -aG lp $USER
newgrp lp
```

- **Sin impresora (pruebas):** `PRINTER_DRY_RUN=true` (los bytes se muestran en
  consola).

Prueba desde Swagger (`http://<IP_RASPBERRY>/api-docs`) con
`POST /api/print/test`, o:

```bash
curl -X POST http://localhost:3000/api/print/test -H "Authorization: Bearer TOKEN"
```

---

## 11. Firewall y puertos

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # Frontend / nginx
sudo ufw allow 3000/tcp   # Backend (solo si NO usas nginx)
sudo ufw enable
```

> Con nginx haciendo proxy, el puerto `3000` puede quedar cerrado al exterior.
> MariaDB (`3306`) **no** debe exponerse fuera de `localhost`.

---

## 12. Verificacion final

1. `curl http://localhost:3000/api/health` -> `{"status":"ok"}`.
2. Abrir `http://<IP_RASPBERRY>/` en un navegador de la red.
3. Iniciar sesion con `admin` / `admin123`.
4. Registrar una venta de prueba y comprobar la impresion.
5. `sudo systemctl status comandapro-backend` -> activo y habilitado.

---

## 13. Actualizaciones

```bash
cd ~/desarrollo
git pull

# Base de datos: solo si hubo cambios de esquema (usar el paquete actualizado)
# mysql -u comandapro_user -p comandapro < Deploy/Produccion/schema.sql  # OJO: recrea tablas
# Revisa siempre las migraciones nuevas en database/migrations/

# Backend
cd back-end && pnpm install && sudo systemctl restart comandapro-backend

# Frontend
cd ../front-end && pnpm install && pnpm build
# nginx sirve dist/ directamente; no requiere reinicio
```

> Los archivos `schema.sql` incluyen `DROP TABLE`, por lo que **recrean** las
> tablas y borran datos. Para actualizar una base en produccion usa migraciones
> incrementales, no el `schema.sql`.

---

## 14. Seguridad

- Cambia la contrasena de `comandapro_user` y de los usuarios de la app.
- Genera un `JWT_SECRET` aleatorio y unico por instalacion.
- No expongas MariaDB ni el puerto `3000` a Internet.
- Manten `back-end/.env` fuera de git (ya esta en `.gitignore`).
- Considera HTTPS (certificado local o Let's Encrypt con dominio) si se accede
  fuera de la red local.

---

## 15. Solucion de problemas

| Sintoma | Causa probable | Solucion |
|---------|----------------|----------|
| `ECONNREFUSED` al abrir la app | Backend caido | `sudo systemctl status comandapro-backend` y `journalctl -u comandapro-backend` |
| `Access denied for user` | Credenciales DB incorrectas | Revisar `DB_USER`/`DB_PASSWORD` en `back-end/.env` |
| Pantalla en blanco al recargar una ruta | Falta el fallback SPA | Confirmar `try_files ... /index.html` en nginx |
| Las peticiones van a `localhost` | URL del API hardcodeada | Ver seccion 8.1 (`API_BASE`) |
| Imagenes de productos no cargan | `/uploads` sin proxy | Agregar `location /uploads/` en nginx |
| La impresora no imprime | IP/puerto/interfaz mal configurados | Ver `documentacion/print.md` |
| `permission denied` en `/dev/usb/lp0` | Usuario sin grupo `lp` | `sudo usermod -aG lp $USER` + re-login |
| El frontend no refleja cambios | Build desactualizado | `pnpm build` de nuevo |

---

## 16. Estructura del proyecto

```
desarrollo/
  back-end/            API Node.js + Express
    .env.example       plantilla de variables (sin secretos)
    src/
  front-end/           React + Vite
    src/
  database/            esquema y migraciones de desarrollo
  documentacion/       manuales (Up.md, print.md, fases/)
  Deploy/              paquetes SQL + esta guia
    Produccion/
    Test/
```
