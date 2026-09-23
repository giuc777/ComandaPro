import { useState, useEffect } from 'react';

const DENOMINATIONS = [
    { value: 100, label: 'Q100' },
    { value: 50, label: 'Q50' },
    { value: 20, label: 'Q20' },
    { value: 10, label: 'Q10' },
    { value: 5, label: 'Q5' },
    { value: 1, label: 'Q1' },
    { value: 0.50, label: 'Q0.50' },
    { value: 0.25, label: 'Q0.25' },
];

export default function ArqueoModal({ shift, arqueo, onConfirm, onClose, loading, error }) {
    const [counts, setCounts] = useState(() =>
        Object.fromEntries(DENOMINATIONS.map(d => [d.value, 0]))
    );

    useEffect(() => {
        if (!arqueo) return;
        setCounts(Object.fromEntries(DENOMINATIONS.map(d => [d.value, 0])));
    }, [arqueo]);

    const updateCount = (value, qty) => {
        setCounts(prev => ({ ...prev, [value]: Math.max(0, qty) }));
    };

    const totalContado = DENOMINATIONS.reduce((sum, d) => sum + d.value * (counts[d.value] || 0), 0);
    const expectedCash = Number(arqueo?.cash_total || 0) + Number(shift?.start_cash || 0);
    const difference = totalContado - expectedCash;

    if (!shift) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <div
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-outline-variant/20">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg text-on-surface font-semibold">Arqueo de Caja</h2>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
                        </button>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">Turno #{shift.id} &middot; {shift.cashier_name}</p>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {error && (
                        <div className="bg-error-container/10 border border-error/30 rounded-xl p-3 flex items-start gap-2">
                            <span className="material-symbols-outlined text-error text-[18px]">error</span>
                            <p className="text-error text-sm font-semibold">{error}</p>
                        </div>
                    )}

                    <div className="bg-primary/5 rounded-xl p-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-on-surface-variant">Efectivo esperado</span>
                            <span className="font-display text-lg text-primary font-bold">Q {expectedCash.toFixed(2)}</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-on-surface mb-3 uppercase tracking-wider">Conteo de Denominaciones</h3>
                        <div className="flex flex-col gap-2">
                            {DENOMINATIONS.map(d => {
                                const subtotal = d.value * (counts[d.value] || 0);
                                return (
                                    <div key={d.value} className="flex items-center gap-3">
                                        <span className="text-sm text-on-surface-variant font-mono w-12">{d.label}</span>
                                        <span className="text-xs text-on-surface-variant">x</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={counts[d.value] || ''}
                                            onChange={e => updateCount(d.value, parseInt(e.target.value) || 0)}
                                            className="input-field text-center w-16 py-1 text-sm"
                                            placeholder="0"
                                        />
                                        <span className="text-xs text-on-surface-variant">=</span>
                                        <span className="text-sm font-semibold text-on-surface font-mono w-20 text-right">
                                            Q {subtotal.toFixed(2)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-outline-variant/20 pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-on-surface-variant">Total contado</span>
                            <span className="font-display text-lg text-on-surface font-bold">Q {totalContado.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-on-surface-variant">Diferencia</span>
                            <span className={`font-display text-base font-bold ${difference >= 0 ? 'text-tertiary' : 'text-error'}`}>
                                {difference >= 0 ? '+' : ''}Q {difference.toFixed(2)}
                                <span className="text-xs font-normal ml-1">
                                    ({difference >= 0 ? 'Sobrante' : 'Faltante'})
                                </span>
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button onClick={onClose} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                        <button
                            onClick={() => onConfirm(totalContado)}
                            disabled={loading}
                            className="btn-primary flex-1 justify-center"
                        >
                            {loading ? 'Cerrando...' : 'Cerrar Turno'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
