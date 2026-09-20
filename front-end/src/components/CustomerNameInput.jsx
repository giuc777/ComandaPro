export default function CustomerNameInput({ value, onChange }) {
    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input-field pl-8 text-[0.8125rem]"
                placeholder="Nombre de cliente (opcional)"
                data-testid="customer-name"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-on-surface-variant/40">person</span>
        </div>
    );
}
