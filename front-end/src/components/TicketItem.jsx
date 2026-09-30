export default function TicketItem({ item, onUpdateQuantity, onRemove, isLast, editable = true, allowPersistedEdits = false }) {
    const hasMods = Array.isArray(item.modifiers) && item.modifiers.length > 0;
    const inKitchen = Boolean(item.sent);
    const canEditQty = editable && !inKitchen && (allowPersistedEdits || !item.persisted);
    const canRemove = !inKitchen;

    return (
        <div className={`flex items-center gap-3 py-3 ${isLast ? '' : 'border-b border-outline-variant/10'} ${inKitchen ? 'opacity-60' : ''}`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[0.8125rem] text-on-surface block">{item.product_name}</span>
                        {item.modifier_labels && (
                            <span className="text-[0.6875rem] text-on-surface-variant block mt-0.5">{item.modifier_labels}</span>
                        )}
                    </div>
                    <span className="font-display text-[0.8125rem] font-bold text-on-surface ml-2 whitespace-nowrap">
                        Q{Number(item.unit_price).toFixed(2)}
                    </span>
                </div>
                {hasMods && (
                    <span className="text-[0.625rem] text-secondary mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">star</span>
                        {item.modifiers.length} modificador(es)
                    </span>
                )}
            </div>

            {inKitchen ? (
                <span
                    className="inline-flex items-center gap-1 text-[0.625rem] font-bold text-secondary whitespace-nowrap"
                    data-testid="item-in-kitchen"
                >
                    <span className="material-symbols-outlined text-[14px]">check_circle</span> EN COCINA
                </span>
            ) : (
                <>
                    {canEditQty ? (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onUpdateQuantity(item.tempId, item.quantity - 1)}
                                className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface text-sm font-bold flex items-center justify-center disabled:opacity-40"
                                data-testid="qty-minus"
                                type="button"
                            >
                                −
                            </button>
                            <span className="w-8 text-center text-sm font-semibold text-on-surface">{item.quantity}</span>
                            <button
                                onClick={() => onUpdateQuantity(item.tempId, item.quantity + 1)}
                                className="w-7 h-7 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-surface text-sm font-bold flex items-center justify-center disabled:opacity-40"
                                data-testid="qty-plus"
                                type="button"
                            >
                                +
                            </button>
                        </div>
                    ) : (
                        <span
                            className="w-10 text-center text-sm font-semibold text-on-surface-variant"
                            data-testid="item-locked-qty"
                        >
                            {item.quantity} ×
                        </span>
                    )}

                    {canRemove && (
                        <button
                            onClick={() => onRemove(item.tempId)}
                            className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container-high hover:text-error transition-colors"
                            data-testid="remove-item"
                            title="Eliminar"
                            type="button"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    )}
                </>
            )}
        </div>
    );
}
