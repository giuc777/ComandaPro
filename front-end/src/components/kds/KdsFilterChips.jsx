const CHIPS = [
    { key: 'all', label: 'Todos', badgeClass: 'bg-primary-container/20 text-primary' },
    { key: 'enviada', label: 'Recibidos', badgeClass: 'bg-primary-container/20 text-primary' },
    { key: 'preparando', label: 'En Preparacion', badgeClass: 'bg-secondary-container/40 text-on-secondary-container' },
    { key: 'lista', label: 'Listos', badgeClass: 'bg-tertiary/15 text-tertiary' },
];

export default function KdsFilterChips({ counts, active, onChange }) {
    return (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto border-b border-outline-variant/10">
            {CHIPS.map(chip => (
                <button
                    key={chip.key}
                    type="button"
                    onClick={() => onChange(chip.key)}
                    className={`chip ${active === chip.key ? 'active' : ''}`}
                    data-testid={`kds-filter-${chip.key}`}
                >
                    {chip.label}
                    <span className={`badge ${chip.badgeClass} ml-1`}>{counts[chip.key] || 0}</span>
                </button>
            ))}
        </div>
    );
}
