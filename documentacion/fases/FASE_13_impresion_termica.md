# Fase 13: Impresion Termica (AON PR-255)

## Objetivo
Imprimir recibos de venta en impresora termica ESC/POS (AON PR-255) conectada
por **red (TCP/IP:9100)** o **USB** directo al servidor.

---

## 1. Configuracion (back-end/.env)

```env
PRINTER_ENABLED=true
PRINTER_INTERFACE=tcp            # tcp | usb
PRINTER_HOST=192.168.1.50
PRINTER_PORT=9100
PRINTER_USB=/dev/usb/lp0         # Linux (Raspberry Pi)
PRINTER_WINDOWS_NAME=POS-80C     # Windows: nombre de la impresora
PRINTER_CHARSET=CP850
PRINTER_WIDTH=80                 # mm (80 -> 48 columnas, 58 -> 32)
PRINTER_TIMEOUT_MS=3000
PRINTER_DRY_RUN=false
```

| Variable | Descripcion |
|----------|-------------|
| `PRINTER_ENABLED` | `true`/`false` — habilita/deshabilita la impresion |
| `PRINTER_INTERFACE` | `tcp` (LAN) o `usb` (local: Linux o Windows) |
| `PRINTER_HOST` | IP de la impresora (solo TCP) |
| `PRINTER_PORT` | Puerto raw de la impresora (solo TCP, usualmente 9100) |
| `PRINTER_USB` | Ruta del dispositivo USB (solo Linux, ej. `/dev/usb/lp0`) |
| `PRINTER_WINDOWS_NAME` | Nombre de la impresora en Windows (ej. `POS-80C`), no el puerto |
| `PRINTER_CHARSET` | Codigo de pagina: CP850 (acentos latinos) |
| `PRINTER_WIDTH` | Ancho de papel en mm: 80 (48 columnas) o 58 (32 columnas) |
| `PRINTER_TIMEOUT_MS` | Timeout de conexion TCP |
| `PRINTER_DRY_RUN` | `true` = imprime bytes a consola sin enviar a la impresora |

> En **Windows** la impresion USB se envia como **RAW** al spooler por el
> **nombre** de la impresora, mediante `scripts/print-raw.ps1` (winspool.drv).
> En **Linux** se escribe directo a `/dev/usb/lp0`.
> Ver la guia completa en [print.md](../print.md).

---

## 2. Arquitectura

```
Browser                  Backend                   Impresora
  │                        │                          │
  │  POST /api/print/      │                          │
  │  receipt/:paymentId    │                          │
  │ ──────────────────────>│                          │
  │                        │  sp_get_payment_by_id    │
  │                        │  sp_get_order            │
  │                        │                          │
  │                        │  buildReceipt()          │
  │                        │  → Buffer ESC/POS        │
  │                        │                          │
  │                        │  net.Socket.connect()    │
  │                        │  ───────────────────────>│
  │  { message: OK }       │                          │
  │ <──────────────────────│                          │
```

- **Sin dependencias pesadas**: el builder ESC/POS es propio (~180 lineas).
- **Sin migracion de BD**: reutiliza `sp_get_payment_by_id` y `sp_get_order`.
- **Impresion no bloqueante**: el pago ya quedo registrado; si falla la
  impresora, se reporta el error pero el cobro no se revierte.

---

## 3. Archivos

| Archivo | Descripcion |
|---------|-------------|
| `back-end/src/config/printer.js` | Lee variables de entorno de impresora |
| `back-end/scripts/print-raw.ps1` | Envio RAW al spooler de Windows (winspool.drv) |
| `back-end/src/services/escpos.js` | Builder ESC/POS con CP850 (buffer, texto, corte, alineacion) |
| `back-end/src/services/printerService.js` | Envia bytes por TCP o USB; cola simple; dry-run |
| `back-end/src/controllers/printController.js` | Endpoint: printReceipt, printTest, getStatus |
| `back-end/src/routes/print.js` | Rutas REST con Swagger JSDoc |
| `front-end/src/components/ReceiptModal.jsx` | Boton "Imprimir" en el modal de recibo |
| `front-end/src/api/apiClient.js` | printReceipt, printTest, getPrinterStatus |

---

## 4. Endpoints REST

| Metodo | Ruta | Descripcion | Auth |
|--------|------|-------------|------|
| `POST` | `/api/print/receipt/:id` | Imprimir recibo de un pago | Si |
| `POST` | `/api/print/test` | Imprimir hoja de prueba | Si |
| `GET`  | `/api/print/status` | Estado de la impresora | Si |

---

## 5. Formato del Recibo (80mm, 48 columnas)

```
        DeerCoffee            (doble altura, centrado)
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

> La linea `IVA 12%` solo aparece cuando se cobro con IVA; por defecto el
> check viene desactivado y la factura no muestra linea de IVA. Fecha/hora
> exactas del pago (`dd/mm/yyyy`, `HH:mm:ss` 24h, America/Guatemala).

---

## 6. Flujo de Uso

1. El cajero cobra una orden -> se abre el `ReceiptModal`.
2. Presiona el boton **"Imprimir"**.
3. El frontend llama `POST /api/print/receipt/:paymentId`.
4. El backend:
   a. Consulta el pago y la orden con items.
   b. Genera los bytes ESC/POS (CP850).
   c. Los envia por TCP (`net.Socket` a `IP:9100`) o USB (`fs.writeFile`).
5. Si la impresora no responde o esta apagada, retorna error y el boton
   cambia a **"Error - Reintentar"**. El cobro NO se revierte.

---

## 7. Modo Dry-Run (sin impresora)

Para desarrollo sin hardware, configurar `PRINTER_DRY_RUN=true`. Los bytes
ESC/POS se imprimen en la consola del backend en formato hexadecimal:

```
[PRINTER DRY-RUN] 187 bytes
[PRINTER HEX] 1b40 1b7402 1b4501 1d2111 ...
```

Esto permite verificar que el formato es correcto antes de conectar la
impresora fisica.

---

## 8. Pruebas

### Prueba de impresion desde Swagger
1. Abrir `http://localhost:3000/api-docs`
2. Buscar `POST /api/print/test`
3. Ejecutar -> la impresora debe imprimir la hoja de prueba.

### Prueba de recibo desde el POS
1. Cerrar un pago -> se abre el modal de recibo.
2. Presionar "Imprimir" -> debe enviar el recibo a la impresora.

### Dry-run
1. Configurar `PRINTER_DRY_RUN=true` en `.env`.
2. Reiniciar backend.
3. Presionar "Imprimir" -> ver bytes en consola del backend.

---

## 9. Notas de Implementacion

### Charset y acentos
La AON PR-255 usa la pagina de codigos por defecto CP437. El builder
configura **CP850** (ESC t 0x02) antes de enviar texto, y mapea caracteres
acentados (á, é, í, ó, ú, ñ) a sus bytes CP850 correspondientes.

### USB en Linux (Raspberry Pi)
Para USB, la impresora debe aparecer como `/dev/usb/lp0` o `/dev/usb/lp1`.
Requiere permisos de escritura (usualmente `sudo usermod -aG lp $USER`).

### TCP/IP
La impresora debe estar configurada con IP fija y el puerto raw (9100)
habilitado. Verificar conectividad con `telnet 192.168.1.50 9100`.

### Cola de impresion
El servicio usa una cola simple para evitar conexiones TCP solapadas.
Una sola impresion a la vez; las siguientes se encolan automaticamente.

### Impresion manual
Por diseno, la impresion es **solo manual** (boton en el modal). La
impresion automatica al cobrar queda como mejora futura.
