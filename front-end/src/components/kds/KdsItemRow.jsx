export default function KdsItemRow({ item, isNew }) {
    return (
        <div className={isNew ? 'bg-primary/5 -mx-1 px-1 rounded-lg' : ''} data-testid={`kds-item-${item.item_id}`}>
            <div className="flex items-center justify-between gap-2 text-[0.8125rem] py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`badge ${isNew ? 'bg-primary text-on-primary' : 'bg-primary-container/10 text-primary'}`}>
                        {item.quantity}x
                    </span>
                    <span className="text-on-surface font-medium truncate">{item.product_name}</span>
                    {isNew && (
                        <span className="text-[0.5625rem] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            NUEVO
                        </span>
                    )}
                </div>
            </div>
            {item.modifier_labels && (
                <div className="pl-7 text-[0.6875rem] text-on-surface-variant">{item.modifier_labels}</div>
            )}
            {item.notes && (
                <div className="pl-7 text-[0.6875rem] text-on-surface-variant italic">{item.notes}</div>
            )}
        </div>
    );
}
