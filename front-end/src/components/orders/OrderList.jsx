import OrderStatusBadge from '../OrderStatusBadge';
import { formatCurrency, minutesSince } from '../../utils/format';

const BTN = 'inline-flex items-center justify-center gap-1 rounded-lg text-[0.7rem] font-semibold min-h-[32px] py-1 px-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function timeAgo(minutes) {
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `${minutes} min`;
    return `${Math.floor(minutes / 60)}h`;
}

export default function OrderList({ orders, busyId, onEdit, onDetail, onSend, onVoid }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="ordenes-list">
            {orders.map(order => {
                const editable = order.status !== 'pagada' && order.status !== 'anulada';
                const canSend = order.status === 'pausada';
                const place = order.table_name || (order.mode === 'llevar' ? 'Para Llevar' : 'Mesa');
                const minutes = typeof order.minutes_open === 'number'
                    ? order.minutes_open
                    : minutesSince(order.created_at);
                const itemCount = (order.items || []).length;

                return (
                    <div
                        key={order.id}
                        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 overflow-hidden shadow-sm"
                        data-testid={`order-card-${order.id}`}
                    >
                        <div className="px-4 py-2.5 bg-surface-container flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="font-display font-bold text-[1rem] text-on-surface">#{order.id}</span>
                                <OrderStatusBadge status={order.status} />
                            </div>
                            <span className="text-[0.6875rem] font-semibold text-on-surface-variant tabular-nums">
                                {timeAgo(minutes)}
                            </span>
                        </div>

                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-on-surface min-w-0">
                                    <span className="material-symbols-outlined text-secondary text-[15px]">
                                        {order.mode === 'llevar' ? 'local_mall' : 'table_bar'}
                                    </span>
                                    <span className="truncate">{place}</span>
                                </span>
                                <span className="font-display text-sm font-bold text-primary shrink-0">
                                    {formatCurrency(order.total)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[0.6875rem] text-on-surface-variant">
                                <span className="truncate">{order.customer_name || 'Sin cliente'}</span>
                                <span>
                                    {itemCount} {itemCount === 1 ? 'ítem' : 'ítems'}
                                </span>
                            </div>

                            {order.created_by_name && (
                                <div className="text-[0.6875rem] text-on-surface-variant opacity-70 mt-1">
                                    Creada por {order.created_by_name}
                                </div>
                            )}
                        </div>

                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                            {editable && (
                                <button
                                    type="button"
                                    disabled={busyId === order.id}
                                    onClick={() => onEdit(order)}
                                    className={`${BTN} flex-1 min-w-[80px] bg-primary-container text-on-primary hover:bg-primary`}
                                    data-testid={`edit-order-${order.id}`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">edit</span> Editar
                                </button>
                            )}
                            <button
                                type="button"
                                disabled={busyId === order.id}
                                onClick={() => onDetail(order)}
                                className={`${BTN} bg-surface-container-high text-on-surface hover:bg-surface-container-highest`}
                                data-testid={`detail-order-${order.id}`}
                            >
                                <span className="material-symbols-outlined text-[14px]">visibility</span> Detalle
                            </button>
                            {canSend && (
                                <button
                                    type="button"
                                    disabled={busyId === order.id}
                                    onClick={() => onSend(order)}
                                    className={`${BTN} flex-1 min-w-[110px] bg-tertiary text-on-tertiary hover:bg-tertiary-container`}
                                    data-testid={`send-order-${order.id}`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">send</span> Enviar a Cocina
                                </button>
                            )}
                            {editable && (
                                <button
                                    type="button"
                                    disabled={busyId === order.id}
                                    onClick={() => onVoid(order)}
                                    className={`${BTN} px-2 text-error hover:text-error`}
                                    data-testid={`void-order-${order.id}`}
                                >
                                    <span className="material-symbols-outlined text-[14px]">cancel</span> Anular
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
