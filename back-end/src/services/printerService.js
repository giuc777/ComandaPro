import net from 'net';
import fs from 'fs';
import os from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import printConfig from '../config/printer.js';
import { buildReceipt, buildTestReceipt } from './escpos.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_PRINT_SCRIPT = join(__dirname, '..', '..', 'scripts', 'print-raw.ps1');

function createPrinterService(pool) {
    let busy = false;
    const queue = [];

    async function drain() {
        if (busy || queue.length === 0) return;
        busy = true;
        const { bytes, resolve, reject } = queue.shift();
        try {
            await sendBytes(bytes);
            resolve();
        } catch (err) {
            reject(err);
        } finally {
            busy = false;
            drain();
        }
    }

    function enqueue(bytes) {
        return new Promise((resolve, reject) => {
            queue.push({ bytes, resolve, reject });
            drain();
        });
    }

    async function sendBytesTcp(bytes) {
        return new Promise((resolve, reject) => {
            const sock = new net.Socket();
            let settled = false;

            const done = (err) => {
                if (settled) return;
                settled = true;
                sock.destroy();
                if (err) reject(err);
                else resolve();
            };

            sock.setTimeout(printConfig.timeout);
            sock.on('timeout', () => done(new Error('Impresora no responde (timeout)')));
            sock.on('error', done);
            sock.on('connect', () => {
                sock.write(bytes, (err) => {
                    if (err) return done(err);
                    setTimeout(() => done(), 500);
                });
            });

            sock.connect(printConfig.port, printConfig.host);
        });
    }

    async function sendBytesWindows(bytes) {
        const printerName = printConfig.windowsName || printConfig.usbPath;
        if (!printerName) {
            throw new Error('Configure PRINTER_WINDOWS_NAME con el nombre de la impresora (ej. POS-80C)');
        }

        const tmp = join(os.tmpdir(), `deercoffee-print-${Date.now()}.bin`);
        await fs.promises.writeFile(tmp, bytes);
        try {
            const { stdout, stderr } = await execFileAsync('powershell.exe', [
                '-NoProfile',
                '-NonInteractive',
                '-ExecutionPolicy', 'Bypass',
                '-File', RAW_PRINT_SCRIPT,
                '-PrinterName', printerName,
                '-FilePath', tmp,
            ]);
            if (stderr && stderr.trim()) throw new Error(stderr.trim());
            if (!stdout.includes('OK')) throw new Error('No se pudo enviar a la impresora');
        } finally {
            fs.promises.unlink(tmp).catch(() => {});
        }
    }

    async function sendBytesUsb(bytes) {
        if (process.platform === 'win32') {
            return sendBytesWindows(bytes);
        }
        await fs.promises.writeFile(printConfig.usbPath, bytes);
    }

    async function sendBytes(bytes) {
        if (printConfig.dryRun) {
            console.log(`[PRINTER DRY-RUN] ${bytes.length} bytes`);
            console.log('[PRINTER HEX]', bytes.toString('hex').match(/.{1,32}/g).join(' '));
            return;
        }

        if (printConfig.interface === 'usb') {
            return sendBytesUsb(bytes);
        }
        return sendBytesTcp(bytes);
    }

    async function printReceipt(paymentId) {
        const payResult = await pool.query(
            'CALL sp_get_payment_by_id(?)', [Number(paymentId)]
        );
        const payRows = payResult[0];
        if (!payRows || !payRows.length) {
            throw new Error('Pago no encontrado');
        }
        const payment = payRows[0];

        const orderResult = await pool.query(
            'CALL sp_get_order(?)', [Number(payment.order_id)]
        );
        const orderRows = orderResult[0];
        const itemRows = orderResult[1] || [];
        if (!orderRows || !orderRows.length) {
            throw new Error('Orden no encontrada');
        }
        const order = { ...orderRows[0], items: itemRows };

        const bytes = buildReceipt(payment, order);
        await enqueue(bytes);
    }

    async function printTest() {
        const bytes = buildTestReceipt();
        await enqueue(bytes);
    }

    function isEnabled() {
        return printConfig.enabled;
    }

    function getStatus() {
        return {
            enabled: printConfig.enabled,
            interface: printConfig.interface,
            host: printConfig.host,
            port: printConfig.port,
            usbPath: printConfig.usbPath,
            windowsName: printConfig.windowsName,
            platform: process.platform,
            widthMm: printConfig.widthMm,
            cols: printConfig.cols,
            dryRun: printConfig.dryRun,
            busy,
        };
    }

    return { printReceipt, printTest, isEnabled, getStatus };
}

export { createPrinterService };
