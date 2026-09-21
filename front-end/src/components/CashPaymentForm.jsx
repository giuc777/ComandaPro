import { useState, useEffect } from 'react';

export default function CashPaymentForm({ total, onAmountGivenChange }) {
    const [amountGiven, setAmountGiven] = useState(total || 0);
    const change = Math.max(0, (Number(amountGiven) || 0) - total);

    useEffect(() => {
        setAmountGiven(total || 0);
    }, [total]);

    useEffect(() => {
        onAmountGivenChange(Number(amountGiven) || 0);
    }, [amountGiven, onAmountGivenChange]);

    return (
        <div className="flex flex-col gap-3">
            <div>
                <label className="block text-xs text-on-surface-variant mb-1 font-semibold uppercase tracking-wider">
                    Recibido
                </label>
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">
                        Q
                    </span>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amountGiven}
                        onChange={e => setAmountGiven(e.target.value)}
                        placeholder="0.00"
                        className="input-field pl-8 text-lg font-display"
                        autoFocus
                    />
                </div>
            </div>
            <div className="flex justify-between items-center px-1">
                <span className="text-sm text-on-surface-variant">Cambio:</span>
                <span className={`font-display text-lg font-bold ${change > 0 ? 'text-tertiary' : 'text-on-surface-variant'}`}>
                    Q {change.toFixed(2)}
                </span>
            </div>
            {amountGiven && Number(amountGiven) < total && (
                <p className="text-error text-xs font-semibold px-1">
                    El monto recibido es menor al total
                </p>
            )}
            <div className="flex gap-2 flex-wrap">
                {[total, Math.ceil(total / 5) * 5, Math.ceil(total / 10) * 10, Math.ceil(total / 20) * 20].map((preset, i) => (
                    <button
                        key={i}
                        onClick={() => setAmountGiven(String(preset))}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/20 transition-colors"
                    >
                        Q{preset.toFixed(0)}
                    </button>
                ))}
            </div>
        </div>
    );
}
