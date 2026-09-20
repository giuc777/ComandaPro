import TicketItem from './TicketItem';

export default function Ticket({ items, onUpdateQuantity, onRemove, totals }) {
    const itemCount = items.length;
    const totalUnits = items.reduce((s, i) => s + i.quantity, 0);

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 flex flex-col h-full">
            <div className="px-4 py-3 border-b border-outline-variant/15 flex items-center justify-between">
                <span className="font-semibold text-sm text-on-surface">Ticket Actual</span>
                <span className="text-[0.6875rem] text-on-surface-variant">
                    {itemCount} {itemCount === 1 ? 'producto' : 'productos'} · {totalUnits} {totalUnits === 1 ? 'unidad' : 'unidades'}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto min-h-[120px]">
                {items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-6 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-[40px] mb-2">add_shopping_cart</span>
                        <p className="text-sm">Agrega productos al ticket</p>
                    </div>
                ) : (
                    <div>
                        {items.map((item, idx) => (
                            <div key={item.tempId} className="px-3">
                                <TicketItem
                                    item={item}
                                    onUpdateQuantity={onUpdateQuantity}
                                    onRemove={onRemove}
                                    isLast={idx === items.length - 1}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-outline-variant/15 px-4 py-3 space-y-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-on-surface-variant">Subtotal</span>
                    <span className="font-display text-sm font-bold text-on-surface">Q{totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">IVA (12%)</span>
                    <span className="text-xs text-on-surface-variant">Q{totals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-outline-variant/10">
                    <span className="font-semibold text-on-surface">Total</span>
                    <span className="font-display text-lg font-bold text-primary">Q{totals.total.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}
