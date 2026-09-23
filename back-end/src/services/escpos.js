import printConfig from '../config/printer.js';

const CP850_MAP = {
    '\u00C0': 0x80, '\u00C1': 0xB5, '\u00C2': 0xB6, '\u00C3': 0xA7,
    '\u00C4': 0x8E, '\u00C5': 0x8F, '\u00C7': 0x80, '\u00C8': 0xD2,
    '\u00C9': 0x90, '\u00CA': 0xD2, '\u00CB': 0xD2, '\u00CC': 0x8B,
    '\u00CD': 0xA1, '\u00CE': 0x8B, '\u00CF': 0x8B, '\u00D1': 0xA5,
    '\u00D2': 0x94, '\u00D3': 0x95, '\u00D4': 0x96, '\u00D5': 0xA4,
    '\u00D6': 0x99, '\u00D9': 0x9A, '\u00DA': 0xA2, '\u00DB': 0x9A,
    '\u00DC': 0x81, '\u00DD': 0xED, '\u00E0': 0x85, '\u00E1': 0xA0,
    '\u00E2': 0x83, '\u00E3': 0xA6, '\u00E4': 0x84, '\u00E5': 0x86,
    '\u00E7': 0x87, '\u00E8': 0x8A, '\u00E9': 0x82, '\u00EA': 0x8A,
    '\u00EB': 0x8A, '\u00EC': 0x8D, '\u00ED': 0xA1, '\u00EE': 0x8D,
    '\u00EF': 0x8D, '\u00F1': 0xA5, '\u00F2': 0x94, '\u00F3': 0xA2,
    '\u00F4': 0x95, '\u00F5': 0xA4, '\u00F6': 0x99, '\u00F9': 0x97,
    '\u00FA': 0xA3, '\u00FB': 0x97, '\u00FC': 0x81, '\u00FD': 0xED,
};

class Escpos {
    constructor(cols = 48) {
        this.cols = cols;
        this.buf = [];
    }

    _enc(str) {
        const bytes = [];
        for (const ch of str) {
            if (ch.charCodeAt(0) < 128) {
                bytes.push(ch.charCodeAt(0));
            } else if (CP850_MAP[ch]) {
                bytes.push(CP850_MAP[ch]);
            } else {
                bytes.push(0x3F);
            }
        }
        return Buffer.from(bytes);
    }

    _line(text) {
        const encoded = this._enc(text);
        this.buf.push(encoded);
        this.buf.push(Buffer.from([0x0A]));
    }

    init() {
        this.buf.push(Buffer.from([0x1B, 0x40]));
        return this;
    }

    cp850() {
        this.buf.push(Buffer.from([0x1B, 0x74, 0x02]));
        return this;
    }

    alignCenter() {
        this.buf.push(Buffer.from([0x1B, 0x61, 0x01]));
        return this;
    }

    alignLeft() {
        this.buf.push(Buffer.from([0x1B, 0x61, 0x00]));
        return this;
    }

    alignRight() {
        this.buf.push(Buffer.from([0x1B, 0x61, 0x02]));
        return this;
    }

    bold(on = true) {
        this.buf.push(Buffer.from([0x1B, 0x45, on ? 1 : 0]));
        return this;
    }

    height2(on = true) {
        this.buf.push(Buffer.from([0x1D, 0x21, on ? 0x11 : 0x00]));
        return this;
    }

    height1() {
        this.buf.push(Buffer.from([0x1D, 0x21, 0x00]));
        return this;
    }

    text(str) {
        this._line(str);
        return this;
    }

    center(str) {
        const plain = str.replace(/\u2550/g, '=').replace(/\u2500/g, '-');
        this.alignCenter();
        this._line(plain);
        this.alignLeft();
        return this;
    }

    centerText(str) {
        this.alignCenter();
        this._line(str);
        this.alignLeft();
        return this;
    }

    item(left, right) {
        const l = left.substring(0, this.cols);
        const r = right.toString();
        const pad = Math.max(0, this.cols - l.length - r.length);
        this._line(l + ' '.repeat(pad) + r);
        return this;
    }

    itemDots(left, right) {
        const l = left.substring(0, this.cols);
        const r = right.toString();
        const dotsLen = Math.max(0, this.cols - l.length - r.length - 2);
        if (dotsLen < 1) {
            this.item(left, right);
            return this;
        }
        this._line(l + ' '.repeat(1) + '.'.repeat(dotsLen) + ' ' + r);
        return this;
    }

    rightAlign(str) {
        this.alignRight();
        this._line(str);
        this.alignLeft();
        return this;
    }

    divider() {
        this._line('-'.repeat(this.cols));
        return this;
    }

    dividerDouble() {
        this.alignCenter();
        this._line('='.repeat(this.cols));
        this.alignLeft();
        return this;
    }

    feed(n = 1) {
        for (let i = 0; i < n; i++) {
            this.buf.push(Buffer.from([0x0A]));
        }
        return this;
    }

    cut() {
        this.buf.push(Buffer.from([0x1D, 0x56, 0x00]));
        return this;
    }

    feedAndCut() {
        this.feed(3);
        this.cut();
        return this;
    }

    toBuffer() {
        return Buffer.concat(this.buf);
    }
}

function buildReceipt(payment, order) {
    const p = new Escpos(printConfig.cols);
    p.init().cp850();

    p.bold(true).height2().centerText('DeerCoffee').height1().bold(false);
    p.centerText('Un cafe con historia');
    p.feed(1);

    p.divider();

    p.alignLeft();
    p.item('Orden:', `#${order.id}`);
    if (order.table_name) p.item('Mesa:', order.table_name);
    if (order.customer_name) p.item('Cliente:', order.customer_name);

    const d = new Date(payment.created_at);
    const dateStr = new Intl.DateTimeFormat('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Guatemala',
    }).format(d);
    const timeStr = new Intl.DateTimeFormat('es-GT', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23', timeZone: 'America/Guatemala',
    }).format(d);
    p.item('Fecha:', dateStr);
    p.item('Hora:', timeStr);

    p.divider();

    if (order.items) {
        for (const item of order.items) {
            const price = (item.quantity * item.unit_price).toFixed(2);
            p.item(`${item.quantity}x ${item.product_name}`, `Q${price}`);
            if (item.modifier_labels) {
                p.alignLeft();
                p._line(`   ${item.modifier_labels}`);
            }
        }
    }

    p.divider();

    p.item('Subtotal:', `Q${Number(order.subtotal || 0).toFixed(2)}`);
    const tax = Number(order.tax || 0);
    if (tax > 0) {
        p.item('IVA 12%:', `Q${tax.toFixed(2)}`);
    }
    p.bold(true);
    p.item('TOTAL:', `Q${Number(order.total || 0).toFixed(2)}`);
    p.bold(false);

    p.divider();

    const methodLabels = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR' };
    const payMethod = methodLabels[payment.method] || payment.method;
    p.item('Pago:', payMethod);

    if (payment.amount_given) {
        p.item('Recibido:', `Q${Number(payment.amount_given).toFixed(2)}`);
        if (Number(payment.change_amount) > 0) {
            p.item('Cambio:', `Q${Number(payment.change_amount).toFixed(2)}`);
        }
    }

    if (payment.cashier_name) {
        p.item('Cajero:', payment.cashier_name);
    }

    p.divider();
    p.centerText('Gracias por su visita');
    p.feedAndCut();

    return p.toBuffer();
}

function buildTestReceipt() {
    const p = new Escpos(printConfig.cols);
    p.init().cp850();
    p.bold(true).height2().centerText('DeerCoffee').height1().bold(false);
    p.centerText('Un cafe con historia');
    p.feed(1);
    p.divider();
    p.centerText('PRUEBA DE IMPRESION');
    p.divider();
    p.item('Fecha:', new Intl.DateTimeFormat('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Guatemala',
    }).format(new Date()));
    p.item('Hora:', new Intl.DateTimeFormat('es-GT', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23', timeZone: 'America/Guatemala',
    }).format(new Date()));
    p.text('');
    p.centerText('La impresora funciona');
    p.centerText('correctamente');
    p.feedAndCut();
    return p.toBuffer();
}

export { Escpos, buildReceipt, buildTestReceipt };
