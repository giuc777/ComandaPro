import { useEffect, useState } from 'react';
import { api } from '../api/apiClient';

export default function ReceiptModal({ payment, order, onClose }) {
    const [printing, setPrinting] = useState(false);
    const [printOk, setPrintOk] = useState(false);
    const [printErr, setPrintErr] = useState(null);

    useEffect(() => {
        if (!payment) return;
        const handleKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [payment, onClose]);

    if (!payment || !order) return null;

    const paymentId = payment.payment_id || payment.id;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('es-GT', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            timeZone: 'America/Guatemala',
        }).format(d);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('es-GT', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hourCycle: 'h23', timeZone: 'America/Guatemala',
        }).format(d);
    };

    const methodLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR' };

    async function handlePrint() {
        if (!paymentId) {
            setPrintErr('El pago no tiene identificador');
            return;
        }
        setPrinting(true);
        setPrintErr(null);
        try {
            await api.printReceipt(paymentId);
            setPrintOk(true);
        } catch (err) {
            setPrintErr(err.message || 'Error al imprimir');
        } finally {
            setPrinting(false);
        }
    }

    const printIcon = printOk ? 'check_circle' : printErr ? 'error' : 'print';
    const printLabel = printing ? 'Imprimiendo...' : printOk ? 'Impreso' : printErr ? 'Error - Reintentar' : 'Imprimir';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-primary text-on-primary p-5 text-center">
                    <h2 className="font-display text-xl font-bold">DeerCoffee</h2>
                    <p className="text-sm opacity-90">Un cafe con historia</p>
                </div>

                <div className="p-5 flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Orden:</span>
                        <span className="font-semibold text-on-surface">#{order.id}</span>
                    </div>
                    {order.table_name && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Mesa:</span>
                            <span className="font-semibold text-on-surface">{order.table_name}</span>
                        </div>
                    )}
                    {order.customer_name && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Cliente:</span>
                            <span className="font-semibold text-on-surface">{order.customer_name}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Fecha:</span>
                        <span className="text-on-surface">{formatDate(payment.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Hora:</span>
                        <span className="text-on-surface">{formatTime(payment.created_at)}</span>
                    </div>

                    <hr className="border-outline-variant/20" />

                    {order.items && order.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                            <span className="text-on-surface">
                                {item.quantity}x {item.product_name}
                                {item.modifier_labels && (
                                    <span className="text-on-surface-variant text-xs block ml-4">
                                        {item.modifier_labels}
                                    </span>
                                )}
                            </span>
                            <span className="font-semibold text-on-surface">
                                Q{(item.quantity * item.unit_price).toFixed(2)}
                            </span>
                        </div>
                    ))}

                    <hr className="border-outline-variant/20" />

                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Subtotal:</span>
                        <span className="text-on-surface">Q{Number(order.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {Number(order.tax || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">IVA 12%:</span>
                            <span className="text-on-surface">Q{Number(order.tax).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-base font-bold">
                        <span className="text-on-surface">Total:</span>
                        <span className="text-primary">Q{Number(order.total || 0).toFixed(2)}</span>
                    </div>

                    <hr className="border-outline-variant/20" />

                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Pago:</span>
                        <span className="text-on-surface">
                            {methodLabel[payment.method] || payment.method}
                            {payment.amount_given ? ` Q${Number(payment.amount_given).toFixed(2)}` : ''}
                        </span>
                    </div>
                    {Number(payment.change_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Cambio:</span>
                            <span className="font-semibold text-tertiary">Q{Number(payment.change_amount).toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-outline-variant/20 flex flex-col gap-2">
                    <p className="text-center text-xs text-on-surface-variant mb-1">
                        La venta queda registrada. Puede finalizar cuando el cliente haya salido.
                    </p>
                    <button
                        onClick={handlePrint}
                        disabled={printing || !paymentId}
                        className={`w-full justify-center flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors ${
                            printOk
                                ? 'bg-tertiary-container text-tertiary'
                                : printErr
                                    ? 'bg-error-container text-error'
                                    : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                        } ${(printing || !paymentId) ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        <span className="material-symbols-outlined text-[18px]">{printIcon}</span>
                        {printLabel}
                    </button>
                    <button
                        onClick={onClose}
                        className="btn-primary w-full justify-center"
                    >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        Finalizar venta
                    </button>
                </div>
            </div>
        </div>
    );
}
