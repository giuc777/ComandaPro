import { useState, useEffect } from 'react';
import { api } from '../api/apiClient';

export default function ParkedOrdersPanel({ onRetomar, onCobrar, onAnular, refreshTrigger }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadParked();
    }, [refreshTrigger]);

    async function loadParked() {
        setLoading(true);
        try {
            const data = await api.getParkedOrders();
            setOrders(data);
        } catch {
            setOrders([]);
        } finally {
            setLoading(false);
        }
    }

    function displayCustomer(order) {
        return order.customer_name || `Orden #${order.id}`;
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
                <h2 className="font-display text-lg text-on-surface font-semibold">Órdenes Pausadas</h2>
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
                        <p className="text-sm">No hay órdenes pausadas</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1 p-2">
                        {orders.map(order => (
                            <div
                                key={order.id}
                                className="bg-surface-container-low rounded-xl border border-outline-variant/15 p-3 hover:bg-surface-container transition-colors"
                                data-testid={`parked-order-${order.id}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <span className="font-display text-[0.9375rem] font-bold text-on-surface">
                                            {displayCustomer(order)}
                                        </span>
                                        <span className="text-[0.6875rem] text-on-surface-variant ml-2">
                                            #{order.id} · {timeAgo(order.minutes_parked || 0)}
                                        </span>
                                    </div>
                                    <span className="text-[0.8125rem] font-bold text-primary">
                                        Q{Number(order.total).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => onRetomar(order)}
                                        className="btn-ghost flex-1 text-[0.7rem] py-1"
                                        data-testid={`retomar-${order.id}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">edit</span> Retomar
                                    </button>
                                    <button
                                        onClick={() => onCobrar(order)}
                                        className="btn-primary flex-1 text-[0.7rem] py-1"
                                        data-testid={`cobrar-${order.id}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">payments</span> Cobrar
                                    </button>
                                    <button
                                        onClick={() => onAnular(order)}
                                        className="btn-ghost flex-1 text-[0.7rem] py-1 text-error hover:text-error"
                                        data-testid={`anular-${order.id}`}
                                    >
                                        <span className="material-symbols-outlined text-[14px]">cancel</span> Anular
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
