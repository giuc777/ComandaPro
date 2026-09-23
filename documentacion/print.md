# Guia de Conexion - Impresora Termica AON PR-255

## Requisitos

- Impresora AON PR-255 (o compatible ESC/POS)
- Papel termico 80mm
- Cable Ethernet (RJ45) o cable USB
- Raspberry Pi 4 (servidor) o PC con Node.js
- IP fija en la red local

---

## Opcion 1: Conexion por Red (Ethernet / LAN) - Recomendada

### 1.1 Configurar IP fija en la impresora

1. Encender la impresora con papel cargado.
2. Imprimir la **pagina de configuracion de red**:
   - Mantener presionado el boton **FEED** mientras se enciende.
   - Soltar cuando parpadee el LED.
   - La impresora imprimira su configuracion actual.
3. Anotar la **IP actual** (ej. `192.168.1.100`).

### 1.2 Cambiar IP a estatica (desde la Raspberry Pi)

Si la IP actual esta en tu subred, acceder al panel web:

```bash
# Abrir en navegador (cambiar IP por la de tu impresora)
http://192.168.1.100
```

En el panel de configuracion:
1. Ir a **Network** > **TCP/IP**.
2. Cambiar a **Static IP**.
3. Configurar:
   - IP Address: `192.168.1.50` (o la que prefieras)
   - Subnet Mask: `255.255.255.0`
   - Gateway: `192.168.1.1` (IP de tu router)
4. Guardar y reiniciar la impresora.

### 1.3 Verificar conexion desde la Raspberry Pi

```bash
# Ping a la impresora
ping 192.168.1.50

# Probar el puerto raw (9100)
nc -zv 192.168.1.50 9100
# Debe responder: Connection to 192.168.1.50 9100 port [tcp/*] succeeded!
```

Si `nc` no funciona, revisar:
- Que la impresora y la Pi esten en la **misma subred**.
- Que el firewall no bloquee el puerto 9100.
- Que el cable Ethernet este conectado correctamente.

### 1.4 Configurar en el backend

En `back-end/.env`:

```env
PRINTER_ENABLED=true
PRINTER_INTERFACE=tcp
PRINTER_HOST=192.168.1.50
PRINTER_PORT=9100
PRINTER_DRY_RUN=false
```

Reiniciar el backend:

```bash
cd desarrollo/back-end
pnpm dev
```

### 1.5 Probar impresion

```bash
# Desde Swagger UI
# Abrir http://localhost:3000/api-docs
# Buscar POST /api/print/test > Try it out > Execute

# O desde curl (reemplazar TOKEN por un JWT valido)
curl -X POST http://localhost:3000/api/print/test \
  -H "Authorization: Bearer TOKEN"
```

La impresora debe imprimir la hoja de prueba.

---

## Opcion 2: Conexion por USB (directo a la Raspberry Pi)

### 2.1 Conectar la impresora

1. Conectar la impresora a un puerto USB de la Raspberry Pi con cable USB-B.
2. Encender la impresora.

### 2.2 Verificar que Linux la detecte

```bash
# Ver dispositivos USB
lsusb
# Deberia aparecer algo como:
# Bus 001 Device 003: ID 0456:0808 Avery Dennison ...

# Ver el device file
ls -la /dev/usb/lp*
# Deberia mostrar: /dev/usb/lp0

# Verificar permisos
ls -la /dev/usb/lp0
# Deberia ser: crw-rw---- 1 root lp ...
```

### 2.3 Dar permisos de escritura al usuario

```bash
# Agregar tu usuario al grupo lp
sudo usermod -aG lp $USER

# Cerrar sesion y volver a entrar, o ejecutar:
newgrp lp
```

### 2.4 Probar impresion directa (sin Node.js)

```bash
# Enviar texto directo al dispositivo
echo "Hola DeerCoffee" > /dev/usb/lp0

# Si funciona, la impresora debe imprimir "Hola DeerCoffee"
```

### 2.5 Configurar en el backend

En `back-end/.env`:

```env
PRINTER_ENABLED=true
PRINTER_INTERFACE=usb
PRINTER_USB=/dev/usb/lp0
PRINTER_DRY_RUN=false
```

Reiniciar el backend y probar con `POST /api/print/test`.

---

## Opcion 3: USB / Spooler en Windows (desarrollo)

En Windows no existe `/dev/usb/lp0`. La impresora se instala como
**impresora de Windows** y el backend le envia los bytes **RAW** al spooler
por su **nombre** (no por el puerto).

### 3.1 Instalar la impresora

1. Conectar la impresora por USB y encenderla.
2. Windows suele detectarla automaticamente como **POS-80C** (o similar).
3. Verificar en **Configuracion > Bluetooth y dispositivos > Impresoras y escaneres**.
4. Anotar el **nombre exacto** de la impresora.

Para listar las impresoras instaladas desde PowerShell:

```powershell
Get-Printer | Select-Object Name, PortName, DriverName | Format-Table -AutoSize
```

Ejemplo de salida:

```
Name            PortName  DriverName
----            --------  ----------
POS-80C         USB001    POS-80C
```

### 3.2 Configurar en el backend

En `back-end/.env`:

```env
PRINTER_ENABLED=true
PRINTER_INTERFACE=usb
PRINTER_WINDOWS_NAME=POS-80C     # nombre exacto de Get-Printer
PRINTER_WIDTH=80
PRINTER_DRY_RUN=false
```

> **Importante:** `PRINTER_WINDOWS_NAME` es el **nombre de la impresora**
> (`POS-80C`), NO el puerto (`USB001`). Enviar al puerto con
> `fs.writeFile('USB001')` no funciona en Windows.

### 3.3 Reiniciar el backend y probar

```bash
cd desarrollo/back-end
pnpm dev
```

```powershell
# Login y prueba (reemplazar TOKEN)
$login = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
  -Method POST -ContentType "application/json" `
  -Body '{"username":"admin","password":"admin123"}'

Invoke-RestMethod -Uri "http://localhost:3000/api/print/test" `
  -Method POST -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

La impresora debe imprimir la hoja de prueba.

### 3.4 Como funciona (RAW al spooler)

El backend escribe los bytes ESC/POS a un archivo temporal y ejecuta
`scripts/print-raw.ps1`, que usa `winspool.drv` (`OpenPrinter`,
`StartDocPrinter`, `WritePrinter`) con tipo de datos **RAW**. Asi se envian
los bytes ESC/POS sin que el driver los modifique.

---

## Solucion de Problemas

### La impresora no imprime

| Sintoma | Causa probable | Solucion |
|---------|---------------|----------|
| No responde al ping | IP incorrecta o cable suelto | Verificar cable y IP con `ifconfig` |
| Ping OK pero no imprime | Puerto 9100 bloqueado | Verificar firewall: `sudo ufw allow 9100` |
| Error "timeout" | Impresora apagada o en sleep | Encender y revisar conexion |
| Error "ECONN refused" | Puerto incorrecto | Verificar puerto en config de la impresora |
| `/dev/usb/lp0` no existe | USB no detectado | Reconectar cable, probar otro puerto USB |
| "Permission denied" en USB | Usuario sin permisos | `sudo usermod -aG lp $USER` + re-login |
| Windows: no imprime y crea archivo "USB001" | Se configuro el puerto en vez del nombre | Usar `PRINTER_WINDOWS_NAME` con el nombre de `Get-Printer` (ej. `POS-80C`) |
| Windows: "No se pudo enviar a la impresora" | Nombre incorrecto o impresora apagada | Verificar nombre exacto con `Get-Printer` |

### Verificar estado de la impresora

```bash
# Desde el backend (con token valido)
curl http://localhost:3000/api/print/status \
  -H "Authorization: Bearer TOKEN"
```

Respuesta:
```json
{
  "enabled": true,
  "interface": "tcp",
  "host": "192.168.1.50",
  "port": 9100,
  "dryRun": false,
  "busy": false
}
```

### Modo pruebas sin impresora

Si no tienes la impresora conectada aun, usar modo dry-run:

```env
PRINTER_DRY_RUN=true
```

Los bytes ESC/POS se imprimen en la consola del backend:

```
[PRINTER DRY-RUN] 187 bytes
[PRINTER HEX] 1b40 1b7402 1b4501 1d2111 ...
```

Esto permite verificar que el formato del recibo es correcto antes de conectar la impresora.

---

## Configuracion de la Gaveta de Dinero (opcional)

Si la AON PR-255 tiene gaveta conectada por el puerto RJ11:

1. Conectar el cable de la gaveta al puerto **Drawer** de la impresora.
2. La gaveta se abre automaticamente al recibir el comando ESC/POS
   (el backend puede agregarlo si se habilita en el futuro).

No requiere configuracion adicional en el software.

---

## Cambiar IP de la impresora (si ya esta configurada)

Si la impresora tiene una IP que no esta en tu subred:

1. Conectar la impresora **directamente** a la Raspberry Pi por USB.
2. Configurar la IP por USB usando el panel web o el software de AON.
3. Desconectar USB y reconectar por Ethernet.

Alternativa: usar el boton FEED para imprimir la configuracion y
averiguar la IP actual, luego acceder al panel web desde la red.

---

## Referencia: Formato del Recibo

```
        DeerCoffee
    Un cafe con historia
--------------------------------
Orden: #123
Mesa: 3
Cliente: Maria
Fecha: 21/09/2026
Hora: 12:30:45
--------------------------------
2x Latte Vainilla
   Avena, Grande
                        Q72.00
1x Espresso             Q18.00
--------------------------------
Subtotal                Q80.36
IVA 12%                  Q9.64
TOTAL                   Q90.00
--------------------------------
Pago: Efectivo         Q100.00
Recibido:              Q100.00
Cambio                  Q10.00
Cajero: Administrador
--------------------------------
     Gracias por su visita
```

Ancho: 80mm (48 caracteres por linea). Charset: CP850.

> La linea `IVA 12%` solo se imprime cuando la venta se cobro con IVA
> (check "Aplicar IVA 12%" en la pantalla de cobro). Por defecto viene
> desactivado y, en ese caso, la factura no muestra ninguna linea de IVA.
> Fecha (`dd/mm/yyyy`) y hora (`HH:mm:ss`, 24h) corresponden al momento del
> pago en zona horaria America/Guatemala.
