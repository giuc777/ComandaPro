const METHODS = [
    { key: 'efectivo', label: 'Efectivo', icon: 'payments' },
    { key: 'tarjeta', label: 'Tarjeta', icon: 'credit_card' },
    { key: 'qr', label: 'QR', icon: 'qr_code' }
];

export default function PaymentMethodSelector({ selected, onSelect }) {
    return (
        <div className="grid grid-cols-3 gap-3">
            {METHODS.map(m => (
                <button
                    key={m.key}
                    onClick={() => onSelect(m.key)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                        selected === m.key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-outline-variant/30 bg-surface text-on-surface-variant hover:border-outline-variant/60'
                    }`}
                >
                    <span className="material-symbols-outlined text-[28px]">{m.icon}</span>
                    <span className="text-sm font-semibold">{m.label}</span>
                </button>
            ))}
        </div>
    );
}
