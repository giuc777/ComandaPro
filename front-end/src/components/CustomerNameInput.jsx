export default function CustomerNameInput({ value, onChange }) {
    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="input-field pl-4 text-[0.8125rem]"
                placeholder="Nombre de cliente (opcional)"
                data-testid="customer-name"
            />
        </div>
    );
}
