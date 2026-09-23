import { useEffect, useState } from 'react';
import { api } from '../api/apiClient';

const METHOD_LABEL = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR' };

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        timeZone: 'America/Guatemala'
    }).format(new Date(dateStr));
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Intl.DateTimeFormat('es-GT', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hourCycle: 'h23', timeZone: 'America/Guatemala'
    }).format(new Date(dateStr));
}

export default function TransactionDetailModal({ transaction, onClose }) {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(Boolean(transaction?.order_id));
    const [error, setError] = useState(null);
    const [printing, setPrinting] = useState(false);
    const [printOk, setPrintOk] = useState(false);
    const [printErr, setPrintErr] = useState(null);

    useEffect(() => {
        const handleKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose]);

    useEffect(() => {
        if (!transaction?.order_id) return;
        api.getOrder(transaction.order_id)
            .then(data => {
                if (data.error) throw new Error(data.error);
                setOrder(data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [transaction]);

    if (!transaction) return null;

    const paymentId = transaction.payment_id;
    const methodLabel = METHOD_LABEL[transaction.method] || transaction.method;

    async function handlePrint() {
        if (!paymentId) {
            setPrintErr('El movimiento no tiene un pago asociado');
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
    const printLabel = printing ? 'Imprimiendo...' : printOk ? 'Impreso' : printErr ? 'Error - Reintentar' : 'Reimprimir';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-primary text-on-primary p-5 text-center flex-shrink-0">
                    <h2 className="font-display text-xl font-bold">Detalle del movimiento</h2>
                    <p className="text-sm opacity-90">
                        {transaction.order_id ? `Orden #${transaction.order_id}` : 'Movimiento manual'}
                    </p>
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-y-auto">
                    {transaction.table_name && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Mesa:</span>
                            <span className="font-semibold text-on-surface">{transaction.table_name}</span>
                        </div>
                    )}
                    {transaction.customer_name && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Cliente:</span>
                            <span className="font-semibold text-on-surface">{transaction.customer_name}</span>
                        </div>
                    )}
                    {transaction.cashier_name && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Cajero:</span>
                            <span className="text-on-surface">{transaction.cashier_name}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Fecha:</span>
                        <span className="text-on-surface">{formatDate(transaction.created_at)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Hora:</span>
                        <span className="text-on-surface">{formatTime(transaction.created_at)}</span>
                    </div>

                    <hr className="border-outline-variant/20" />

                    {loading && (
                        <div className="py-6 text-center">
                            <span className="material-symbols-outlined text-[32px] text-on-surface-variant animate-pending">hourglass_empty</span>
                        </div>
                    )}

                    {error && (
                        <p className="text-error text-sm text-center py-2">{error}</p>
                    )}

                    {!loading && !error && order?.items?.map((item, i) => (
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

                    {!loading && !error && !order && (
                        <p className="text-on-surface-variant text-sm text-center py-2">
                            Este movimiento no tiene una orden asociada.
                        </p>
                    )}

                    {order && (
                        <>
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
                        </>
                    )}

                    <div className="flex justify-between text-base font-bold">
                        <span className="text-on-surface">Total:</span>
                        <span className="text-primary">Q{Number(transaction.amount || 0).toFixed(2)}</span>
                    </div>

                    <hr className="border-outline-variant/20" />

                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Pago:</span>
                        <span className="text-on-surface">
                            {methodLabel}
                            {transaction.amount_given ? ` \u00b7 Recibido Q${Number(transaction.amount_given).toFixed(2)}` : ''}
                        </span>
                    </div>
                    {Number(transaction.change_amount) > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-on-surface-variant">Cambio:</span>
                            <span className="font-semibold text-tertiary">Q{Number(transaction.change_amount).toFixed(2)}</span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-outline-variant/20 flex flex-col gap-2 flex-shrink-0">
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
                    <button onClick={onClose} className="btn-secondary w-full justify-center">
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
