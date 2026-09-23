import dotenv from 'dotenv';

dotenv.config();

const widthMm = Number(process.env.PRINTER_WIDTH) || 80;

const printConfig = {
    enabled: process.env.PRINTER_ENABLED !== 'false',
    interface: process.env.PRINTER_INTERFACE || 'tcp',
    host: process.env.PRINTER_HOST || '192.168.1.50',
    port: Number(process.env.PRINTER_PORT) || 9100,
    usbPath: process.env.PRINTER_USB || '/dev/usb/lp0',
    windowsName: process.env.PRINTER_WINDOWS_NAME || '',
    charset: process.env.PRINTER_CHARSET || 'CP850',
    widthMm,
    cols: widthMm >= 80 ? 48 : 32,
    timeout: Number(process.env.PRINTER_TIMEOUT_MS) || 3000,
    dryRun: process.env.PRINTER_DRY_RUN === 'true',
};

export default printConfig;
