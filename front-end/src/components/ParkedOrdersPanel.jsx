import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/apiClient';
import OrderStatusBadge from './OrderStatusBadge';

export default function ParkedOrdersPanel({ onRetomar, onCobrar, onAnular, onSend, onAppend, refreshTrigger }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadActive = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const data = await api.getActiveOrders();
            setOrders(Array.isArray(data) ? data : []);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadActive();
    }, [refreshTrigger, loadActive]);

    useEffect(() => {
        const interval = setInterval(() => loadActive(true), 15000);
        return () => clearInterval(interval);
    }, [loadActive]);

    function displayCustomer(order) {
        return order.customer_name || `Orden #${order.id}`;
    }

    function minutesOf(order) {
        if (typeof order.minutes_parked === 'number') return order.minutes_parked;
        if (!order.parked_at) return 0;
        const started = Date.parse(order.parked_at);
        if (Number.isNaN(started)) return 0;
        return Math.max(0, Math.floor((Date.now() - started) / 60000));
    }

    function timeAgo(minutes) {
        if (minutes < 1) return 'Ahora';
        if (minutes < 60) return `${minutes} min`;
        const h = Math.floor(minutes / 60);
        return `${h}h`;
    }

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 flex flex-col h-full">
            <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between">
                <h2 className="font-display text-lg text-on-surface font-semibold">Órdenes en Curso</h2>
                <span className="text-[0.6875rem] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-lg">
                    {orders.length} {orders.length === 1 ? 'orden' : 'ordenes'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[160px]">
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-8 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[32px] mb-2">local_cafe</span>
                        <p className="text-sm">No hay ordenes en curso</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 p-2">
                        {orders.map(order => {
                            const canSend = order.status === 'pausada';
                            const canPay = order.status === 'lista' || order.status === 'completada';
                            const canAppend = ['enviada', 'preparando', 'lista', 'completada'].includes(order.status);

                            return (
                                <div
                                    key={order.id}
                                    className="bg-surface-container-low rounded-xl border border-outline-variant/15 p-3 hover:bg-surface-container transition-colors"
                                    data-testid={`parked-order-${order.id}`}
                                >
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <div className="min-w-0">
                                            <span className="font-display text-[0.9375rem] font-bold text-on-surface">
                                                {displayCustomer(order)}
                                            </span>
                                            <span className="text-[0.6875rem] text-on-surface-variant ml-2">
                                                #{order.id} · {timeAgo(minutesOf(order))}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <OrderStatusBadge status={order.status} />
                                            <span className="text-[0.8125rem] font-bold text-primary">
                                                Q{Number(order.total).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {order.mode === 'mesa' || order.table_name ? (
                                        <div className="flex items-center gap-1 text-[0.6875rem] text-on-surface-variant mb-2">
                                            <span className="material-symbols-outlined text-[13px]">table_bar</span>
                                            {order.table_name || 'Mesa'}
                                            {order.created_by_name ? ` · ${order.created_by_name}` : ''}
                                        </div>
                                    ) : null}

                                    <div className="flex gap-1.5 flex-wrap">
                                        {canSend && (
                                            <button
                                                onClick={() => onSend(order)}
                                                className="btn-primary flex-1 min-w-[130px] text-[0.7rem] py-1"
                                                data-testid={`send-kitchen-${order.id}`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">send</span> Enviar a Cocina
                                            </button>
                                        )}
                                        {canSend && (
                                            <button
                                                onClick={() => onRetomar(order)}
                                                className="btn-ghost flex-1 min-w-[90px] text-[0.7rem] py-1"
                                                data-testid={`retomar-${order.id}`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">edit</span> Retomar
                                            </button>
                                        )}
                                        {canPay && (
                                            <button
                                                onClick={() => onCobrar(order)}
                                                className="btn-primary flex-1 min-w-[110px] text-[0.7rem] py-1"
                                                data-testid={`cobrar-${order.id}`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">payments</span> Cobrar
                                            </button>
                                        )}
                                        {canAppend && (
                                            <button
                                                onClick={() => (onAppend || onRetomar)(order)}
                                                className="btn-primary flex-1 min-w-[110px] text-[0.7rem] py-1"
                                                data-testid={`append-${order.id}`}
                                            >
                                                <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span> Agregar
                                            </button>
                                        )}
                                        {!canSend && !canPay && !canAppend && (
                                            <span className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1 text-[0.6875rem] text-on-surface-variant bg-surface-container rounded-lg px-2 py-1.5">
                                                <span className="material-symbols-outlined text-[13px]">restaurant</span>
                                                En cocina
                                            </span>
                                        )}
                                        <button
                                            onClick={() => onAnular(order)}
                                            className="btn-ghost text-[0.7rem] py-1 px-2 text-error hover:text-error"
                                            data-testid={`anular-${order.id}`}
                                        >
                                            <span className="material-symbols-outlined text-[14px]">cancel</span> Anular
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
