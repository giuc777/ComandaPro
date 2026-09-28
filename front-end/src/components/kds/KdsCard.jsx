import { minutesSince } from '../../utils/format';
import KdsItemRow from './KdsItemRow';
import KdsStatusBadge from './KdsStatusBadge';

const BASE_ACTION =
    'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-[0.75rem] font-semibold ' +
    'min-h-[36px] py-1.5 px-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const ACTIONS = {
    enviada: {
        next: 'preparando',
        label: 'Preparar',
        icon: 'play_arrow',
        className: `${BASE_ACTION} bg-primary-container text-on-primary hover:bg-primary`,
    },
    preparando: {
        next: 'lista',
        label: 'Listo',
        icon: 'check',
        className: `${BASE_ACTION} bg-tertiary text-on-tertiary hover:bg-tertiary-container`,
    },
    lista: {
        next: 'completada',
        label: 'Entregar',
        icon: 'done_all',
        className: `${BASE_ACTION} bg-surface-container-high text-on-surface hover:bg-surface-container-highest`,
    },
};

export default function KdsCard({ order, now, busy, onStatus, onVoid }) {
    const elapsed = minutesSince(order.sent_at, now);
    const isDelayed = elapsed > 15 && order.status !== 'lista';
    const action = ACTIONS[order.status];
    const place = order.mode === 'llevar' || !order.table_name ? 'Para Llevar' : order.table_name;

    return (
        <div
            className={`kds-card bg-surface-container-lowest rounded-2xl border overflow-hidden shadow-sm ${
                isDelayed ? 'border-error/40' : 'border-outline-variant/15'
            }`}
            data-testid={`kds-card-${order.id}`}
        >
            <div
                className={`px-4 py-2.5 flex items-center justify-between ${
                    isDelayed ? 'bg-error/10' : 'bg-surface-container'
                }`}
            >
                <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-[1rem] text-on-surface">#{order.id}</span>
                    <KdsStatusBadge status={order.status} />
                </div>
                <div className="flex items-center gap-1.5">
                    {isDelayed && (
                        <span className="material-symbols-outlined text-error text-[14px] animate-pulse">
                            schedule
                        </span>
                    )}
                    <span
                        className={`text-[0.6875rem] font-semibold ${
                            isDelayed ? 'text-error' : 'text-on-surface-variant'
                        }`}
                    >
                        {elapsed} min
                    </span>
                </div>
            </div>

            <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-secondary text-[16px]">table_bar</span>
                        <span className="font-semibold text-[0.8125rem] text-on-surface truncate">{place}</span>
                    </div>
                    <span className="text-[0.6875rem] text-on-surface-variant">{order.created_by_name || ''}</span>
                </div>
                <div className="divider" />
                <div className="flex flex-col gap-1.5 mt-2">
                    {order.items.map(item => (
                        <KdsItemRow
                            key={item.item_id}
                            item={item}
                            isNew={!item.prepared_at && (order.status === 'enviada' || !item.sent)}
                        />
                    ))}
                </div>
            </div>

            <div className="px-4 pb-3 flex gap-2">
                {action && (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={() => onStatus(order, action.next)}
                        className={action.className}
                        data-testid={`kds-action-${order.id}`}
                    >
                        <span className="material-symbols-outlined text-[16px]">{action.icon}</span> {action.label}
                    </button>
                )}
                <button
                    type="button"
                    disabled={busy}
                    onClick={() => onVoid(order)}
                    className="btn-ghost text-error text-[0.6875rem] py-2 px-2 min-h-[36px] hover:text-error"
                    data-testid={`kds-void-${order.id}`}
                >
                    <span className="material-symbols-outlined text-[14px]">cancel</span>
                </button>
            </div>
        </div>
    );
}
