export default function OrderModeToggle({ mode, onChange }) {
    return (
        <div className="inline-flex p-0.5 rounded-xl bg-surface-container items-center" data-testid="order-mode-toggle">
            <button
                onClick={() => onChange('mesa')}
                className={`px-3 py-1.5 text-[0.75rem] font-semibold rounded-lg transition-all ${mode === 'mesa' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                data-testid="mode-mesa"
            >
                <span className="material-symbols-outlined text-[14px] mr-1">table_restaurant</span> En Mesa
            </button>
            <button
                onClick={() => onChange('llevar')}
                className={`px-3 py-1.5 text-[0.75rem] font-semibold rounded-xl transition-all ${mode === 'llevar' ? 'bg-primary-container text-on-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
                data-testid="mode-llevar"
            >
                <span className="material-symbols-outlined text-[14px] mr-1">local_mall</span> Para Llevar
            </button>
        </div>
    );
}
