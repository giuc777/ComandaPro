# Fase 12: Testing E2E y Deploy

## Objetivo
Implementar pruebas completas con Playwright, documentación de deploy, y configuración de producción en Raspberry Pi.

---

## 1. Configuración de Playwright

### Instalación:
```bash
cd front-end
pnpm add -D @playwright/test
npx playwright install
```

### playwright.config.js:
```javascript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
  },
});
```

---

## 2. Pruebas E2E por Flujos

### 2.1 Flujo de Autenticación
```javascript
// tests/auth.spec.js
import { test, expect } from '@playwright/test';

test.describe('Autenticación', () => {
  test('login exitoso redirige al dashboard', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('login fallido muestra error', async ({ page }) => {
    await page.goto('/#/login');
    await page.fill('input[name="username"]', 'wrong');
    await page.fill('input[name="password"]', 'wrong');
    await page.click('button[type="submit"]');
    await expect(page.locator('.toast-error')).toBeVisible();
  });

  test('logout limpia sesión', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.click('button[title="Cerrar sesión"]');
    await expect(page).toHaveURL(/login/);
  });
});
```

### 2.2 Flujo POS Completo
```javascript
// tests/pos-flow.spec.js
test.describe('Flujo POS', () => {
  test('crear orden y enviar a cocina', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/pos');

    // Seleccionar producto
    await page.click('[data-product="1"]');

    // Seleccionar modificadores
    await page.click('[data-modifier="avena"]');
    await page.click('[data-modifier="grande"]');
    await page.click('.modifier-confirm');

    // Verificar item en ticket
    await expect(page.locator('.ticket-item')).toHaveCount(1);

    // Enviar a cocina
    await page.click('button:has-text("Enviar a Cocina")');
    await expect(page.locator('.toast-success')).toBeVisible();
  });
});
```

### 2.3 Flujo KDS
```javascript
// tests/kds-flow.spec.js
test.describe('Flujo KDS', () => {
  test('cambiar status de orden', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/kds');

    // Marcar como preparando
    await page.click('.kds-card:first-child .btn-preparing');
    await expect(page.locator('.kds-card:first-child .status'))
      .toContainText('Preparando');

    // Marcar como listo
    await page.click('.kds-card:first-child .btn-ready');
    await expect(page.locator('.kds-card:first-child .status'))
      .toContainText('Listo');
  });
});
```

### 2.4 Flujo de Cobro
```javascript
// tests/payment-flow.spec.js
test.describe('Flujo de Cobro', () => {
  test('cobrar en efectivo calcula cambio', async ({ page }) => {
    // Preparar: crear orden y enviar a cocina
    await crearOrdenYEnviar(page);

    // Ir a pago
    await page.goto('/#/pos/pago');

    // Seleccionar efectivo
    await page.click('[data-method="efectivo"]');
    await page.fill('input[name="amount"]', '40');

    // Verificar cambio
    await expect(page.locator('.change-amount')).toContainText('Q4.00');

    // Cobrar
    await page.click('button:has-text("Cobrar")');
    await expect(page.locator('.receipt-modal')).toBeVisible();
  });
});
```

### 2.5 Flujo de Turno
```javascript
// tests/shift-flow.spec.js
test.describe('Flujo de Turno', () => {
  test('abrir y cerrar turno', async ({ page }) => {
    await loginAs(page, 'admin');

    // Abrir turno
    await page.goto('/#/caja/abrir');
    await page.fill('input[name="startCash"]', '200');
    await page.click('button:has-text("Abrir Turno")');
    await expect(page.locator('.shift-status')).toContainText('Abierto');

    // Cerrar turno
    await page.goto('/#/caja/arqueo');
    await page.fill('input[name="actualCash"]', '250');
    await page.click('button:has-text("Cerrar Turno")');
    await expect(page.locator('.difference')).toContainText('+Q50.00');
  });
});
```

### 2.6 Permisos por Rol
```javascript
// tests/permissions.spec.js
test.describe('Permisos', () => {
  test('barista no puede acceder a reportes', async ({ page }) => {
    await loginAs(page, 'mateo');
    await page.goto('/#/reportes');
    await expect(page).toHaveURL(/dashboard/);
  });

  test('admin puede acceder a reportes', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/#/reportes');
    await expect(page).toHaveURL(/reportes/);
  });
});
```

---

## 3. Scripts de Test

### package.json (front-end):
```json
{
  "scripts": {
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:debug": "playwright test --debug",
    "test:report": "playwright show-report"
  }
}
```

---

## 4. Guía de Deploy en Raspberry Pi

### 4.1 Preparar Raspberry Pi:
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar MariaDB
sudo apt install -y mariadb-server
sudo mysql_secure_installation

# Instalar Nginx
sudo apt install -y nginx
```

### 4.2 Configurar Base de Datos:
```bash
# Crear base de datos y usuario
sudo mysql -u root -p
CREATE DATABASE comandapro;
CREATE USER 'comandapro_user'@'localhost' IDENTIFIED BY 'tu_password';
GRANT ALL PRIVILEGES ON comandapro.* TO 'comandapro_user'@'localhost';
FLUSH PRIVILEGES;

# Ejecutar migraciones
mysql -u comandapro_user -p comandapro < database/01_create_tables.sql
mysql -u comandapro_user -p comandapro < database/02_seed_data.sql
```

### 4.3 Desplegar Backend:
```bash
# Clonar repo
cd /home/pi
git clone <repo-url> deercoffee
cd deercoffee/desarrollo/back-end

# Instalar dependencias
pnpm install --production

# Configurar .env
cp .env.example .env
nano .env  # Editar variables

# Crear servicio systemd
sudo nano /etc/systemd/system/comandapro-api.service
```

### 4.4 Servicio systemd (backend):
```ini
[Unit]
Description=ComandaPro API
After=network.target mariadb.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/deercoffee/desarrollo/back-end
ExecStart=/usr/bin/node src/index.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 4.5 Desplegar Frontend:
```bash
cd /home/pi/deercoffee/desarrollo/front-end
pnpm install
pnpm build  # Genera dist/

# Copiar a Nginx
sudo cp -r dist/* /var/www/comandapro/
```

### 4.6 Configurar Nginx:
```nginx
# /etc/nginx/sites-available/comandapro
server {
    listen 80;
    server_name localhost;

    # Frontend
    location / {
        root /var/www/comandapro;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/comandapro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4.7 Iniciar servicios:
```bash
sudo systemctl enable comandapro-api
sudo systemctl start comandapro-api
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable mariadb
sudo systemctl start mariadb
```

---

## 5. Archivos de Deploy

```
desarrollo/
├── deploy/
│   ├── nginx.conf              # Configuración Nginx
│   ├── comandapro-api.service  # Servicio systemd backend
│   └── setup.sh                # Script de instalación
└── database/
    └── migrations/             # Migraciones por fase
        ├── 01_users.sql
        ├── 02_products.sql
        ├── 03_modifiers.sql
        └── ...
```

---

## 6. Checklist de Producción

- [ ] Variables de entorno configuradas (no hardcodeadas)
- [ ] Passwords hasheados con bcrypt
- [ ] JWT secret en variable de entorno
- [ ] CORS configurado para dominio de producción
- [ ] MariaDB optimizado para Raspberry Pi (ver stack_tecnologias.md)
- [ ] Nginx sirviendo frontend estático
- [ ] Backend como servicio systemd
- [ ] Logs configurados
- [ ] Backup de base de datos programado
- [ ] HTTPS configurado (Let's Encrypt)

---

## 7. Comandos Útiles

```bash
# Desarrollo local
cd back-end && pnpm dev
cd front-end && pnpm dev

# Tests
cd front-end && pnpm test

# Build producción
cd front-end && pnpm build

# Deploy
scp -r dist/* pi@raspberrypi:/var/www/comandapro/
ssh pi@raspberrypi 'sudo systemctl restart comandapro-api'
```
