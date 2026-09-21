import { useEffect } from 'react';

export default function ReceiptModal({ payment, order, onClose }) {
    useEffect(() => {
        if (!payment) return;
        const handleKey = e => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [payment, onClose]);

    if (!payment || !order) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
    };

    const methodLabel = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', qr: 'QR' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="bg-primary text-on-primary p-5 text-center">
                    <h2 className="font-display text-xl font-bold">DeerCoffee</h2>
                    <p className="text-sm opacity-90">Roma Norte</p>
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
                    <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">IVA 12%:</span>
                        <span className="text-on-surface">Q{Number(order.tax || 0).toFixed(2)}</span>
                    </div>
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

                <div className="p-4 border-t border-outline-variant/20">
                    <button
                        onClick={onClose}
                        className="btn-primary w-full justify-center"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
