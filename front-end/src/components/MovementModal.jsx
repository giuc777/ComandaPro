import { useState } from 'react';
import { api } from '../api/apiClient';

const METHODS = [
    { value: 'efectivo', label: 'Efectivo', icon: 'payments' },
    { value: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
    { value: 'qr', label: 'QR', icon: 'qr_code' }
];

const COPY = {
    income: {
        title: 'Registrar ingreso',
        subtitle: 'Propina, aporte u otro ingreso a caja',
        icon: 'add_circle',
        submit: 'Registrar ingreso',
        suggestions: ['Propina', 'Aporte de caja', 'Venta fuera de sistema']
    },
    expense: {
        title: 'Registrar egreso',
        subtitle: 'Retiro de efectivo para compras u otro gasto',
        icon: 'remove_circle',
        submit: 'Registrar egreso',
        suggestions: ['Compra de ingredientes', 'Retiro de caja', 'Gasto operativo']
    }
};

function formatCurrency(amount) {
    return `Q ${Number(amount || 0).toFixed(2)}`;
}

export default function MovementModal({ mode = 'income', shiftId, onClose, onSaved }) {
    const copy = COPY[mode] || COPY.income;
    const isExpense = mode === 'expense';
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('efectivo');
    const [concept, setConcept] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const amountValue = Number(amount);
    const valid = concept.trim().length > 0 && Number.isFinite(amountValue) && amountValue > 0;

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!valid || saving) return;
        setSaving(true);
        setError(null);
        try {
            await api.recordShiftTransaction(shiftId, {
                type: mode,
                method: isExpense ? 'efectivo' : method,
                amount: amountValue,
                concept: concept.trim()
            });
            if (onSaved) onSaved();
            if (onClose) onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40" />
            <form
                data-testid="movement-modal"
                onSubmit={handleSubmit}
                className="relative bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="p-5 border-b border-outline-variant/20">
                    <div className="flex items-center justify-between">
                        <h2 className="font-display text-lg text-on-surface font-semibold flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[20px] ${isExpense ? 'text-error' : 'text-tertiary'}`}>{copy.icon}</span>
                            {copy.title}
                        </h2>
                        <button type="button" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high">
                            <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
                        </button>
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1">Turno #{shiftId} &middot; {copy.subtitle}</p>
                </div>

                <div className="p-5 flex flex-col gap-4">
                    {error && (
                        <div data-testid="movement-error" className="bg-error-container/10 border border-error/30 rounded-xl p-3 flex items-start gap-2">
                            <span className="material-symbols-outlined text-error text-[18px]">error</span>
                            <p className="text-error text-sm font-semibold">{error}</p>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Monto</label>
                        <input
                            data-testid="movement-amount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="input-field w-full mt-1"
                            placeholder="0.00"
                            autoFocus
                        />
                        {Number.isFinite(amountValue) && amountValue > 0 && (
                            <p className="text-xs text-on-surface-variant mt-1">{formatCurrency(amountValue)}</p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Metodo</label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                            {METHODS.map(m => {
                                const disabled = isExpense && m.value !== 'efectivo';
                                const active = isExpense ? m.value === 'efectivo' : method === m.value;
                                return (
                                    <button
                                        key={m.value}
                                        type="button"
                                        data-testid={`movement-method-${m.value}`}
                                        disabled={disabled}
                                        onClick={() => setMethod(m.value)}
                                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                                            active
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                                        } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                        {isExpense && (
                            <p className="text-xs text-on-surface-variant mt-1">Un egreso solo puede ser en efectivo.</p>
                        )}
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Concepto</label>
                        <input
                            data-testid="movement-concept"
                            type="text"
                            maxLength={120}
                            value={concept}
                            onChange={e => setConcept(e.target.value)}
                            className="input-field w-full mt-1"
                            placeholder={isExpense ? 'Ej. Compra de ingredientes' : 'Ej. Propina'}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {copy.suggestions.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setConcept(s)}
                                    className="px-2 py-1 rounded-full bg-surface-container text-[0.6875rem] text-on-surface-variant hover:bg-surface-container-high"
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            data-testid="movement-submit"
                            disabled={!valid || saving}
                            className="btn-primary flex-1 justify-center disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : copy.submit}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
