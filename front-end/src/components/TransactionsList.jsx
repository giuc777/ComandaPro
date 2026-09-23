const METHOD_META = {
    efectivo: { label: 'Efectivo', icon: 'payments', className: 'bg-tertiary/10 text-tertiary' },
    tarjeta: { label: 'Tarjeta', icon: 'credit_card', className: 'bg-primary/10 text-primary' },
    qr: { label: 'QR', icon: 'qr_code', className: 'bg-secondary/10 text-secondary' }
};

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

function formatTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

export default function TransactionsList({ transactions = [], loading = false, onSelect, emptyText = 'Sin movimientos registrados' }) {
    if (loading) {
        return (
            <div className="py-8 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant animate-pending">hourglass_empty</span>
            </div>
        );
    }

    if (!transactions.length) {
        return (
            <div className="py-8 text-center text-on-surface-variant text-sm">{emptyText}</div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {transactions.map(tx => {
                const meta = METHOD_META[tx.method] || { label: tx.method, icon: 'receipt', className: 'bg-surface-container text-on-surface-variant' };
                const isVoid = tx.type === 'void';
                const isRefund = tx.type === 'refund';
                const label = tx.customer_name || tx.table_name || (tx.order_id ? `Orden #${tx.order_id}` : 'Movimiento manual');
                const sub = [tx.order_id ? `#${tx.order_id}` : null, tx.table_name, formatTime(tx.created_at)]
                    .filter(Boolean)
                    .join(' \u00b7 ');

                return (
                    <button
                        key={tx.id}
                        onClick={() => onSelect && onSelect(tx)}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors text-left w-full"
                    >
                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.className}`}>
                            <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-[0.8125rem] font-semibold text-on-surface truncate">{label}</p>
                            <p className="text-[0.6875rem] text-on-surface-variant truncate">
                                {sub}
                                {tx.item_count > 0 ? ` \u00b7 ${tx.item_count} art.` : ''}
                            </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-bold ${isVoid ? 'text-error line-through' : 'text-on-surface'}`}>
                                {formatCurrency(tx.amount)}
                            </p>
                            <p className="text-[0.625rem] font-semibold uppercase tracking-wide text-on-surface-variant">
                                {isVoid ? 'Anulada' : isRefund ? 'Devolución' : meta.label}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
