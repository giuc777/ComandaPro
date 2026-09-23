import { useState, useEffect } from 'react';

const STATUS_META = {
    free: { label: 'Libre', dot: 'bg-green-500', chip: 'bg-green-100 text-green-700' },
    occupied: { label: 'Ocupada', dot: 'bg-red-500', chip: 'bg-red-100 text-red-700' },
    dirty: { label: 'Sucia', dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700' },
};

export default function TableSelector({ tables, selectedId, onSelect, onClose }) {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        function handleEsc(e) {
            if (e.key === 'Escape') { setOpen(false); onClose?.(); }
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [open, onClose]);

    function close() {
        setOpen(false);
        onClose?.();
    }

    function handleSelect(table) {
        onSelect(table);
        close();
    }

    const selected = tables.find(t => t.id === selectedId);
    const selectedMeta = selected ? (STATUS_META[selected.status] || STATUS_META.free) : null;

    return (
        <>
            <button type="button" onClick={() => setOpen(true)}
                className="group flex items-center gap-2.5 bg-surface-container-lowest hover:bg-primary/5 border border-outline-variant/40 hover:border-primary/50 rounded-xl pl-3 pr-3.5 py-2 shadow-sm hover:shadow transition-all"
                data-testid="table-selector">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">table_restaurant</span>
                </span>
                <div className="flex flex-col text-left leading-tight">
                    <span className="text-[0.625rem] uppercase tracking-wider text-on-surface-variant font-semibold">Mesa</span>
                    <span className="text-[0.8125rem] font-bold text-on-surface flex items-center gap-1.5">
                        {selected ? selected.name : 'Seleccionar mesa'}
                        {selectedMeta && <span className={`w-1.5 h-1.5 rounded-full ${selectedMeta.dot}`}></span>}
                    </span>
                </div>
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-hover:text-primary transition-colors">expand_more</span>
            </button>

            {open && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={close}>
                    <div className="absolute inset-0 bg-black/40" />
                    <div
                        className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[22px]">table_restaurant</span>
                                <h2 className="font-display text-lg text-on-surface font-semibold">Seleccionar Mesa</h2>
                            </div>
                            <button onClick={close} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high">
                                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto">
                            {tables.length === 0 ? (
                                <p className="text-sm text-on-surface-variant text-center py-8">No hay mesas disponibles</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {tables.map(table => {
                                        const meta = STATUS_META[table.status] || STATUS_META.free;
                                        const isSelected = selectedId === table.id;
                                        return (
                                            <button key={table.id} onClick={() => handleSelect(table)}
                                                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${isSelected
                                                    ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                                                    : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary/50 hover:bg-primary/5'}`}
                                                data-testid={`table-option-${table.id}`}>
                                                <span className="material-symbols-outlined text-[24px] text-primary">table_restaurant</span>
                                                <span className="text-[0.8125rem] font-bold text-on-surface">{table.name}</span>
                                                <span className="text-[0.6875rem] text-on-surface-variant">{table.capacity} pers.</span>
                                                <span className={`px-2 py-0.5 rounded-full text-[0.625rem] font-bold flex items-center gap-1 ${meta.chip}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`}></span>
                                                    {meta.label}
                                                </span>
                                                {isSelected && (
                                                    <span className="absolute top-1.5 right-1.5 material-symbols-outlined text-[16px] text-primary">check_circle</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
