export default function KpiCard({ icon, label, value, sublabel, accent = 'primary' }) {
    const accents = {
        primary: 'bg-primary-container/10 text-primary-container',
        tertiary: 'bg-tertiary-container/10 text-tertiary',
        secondary: 'bg-secondary-container/40 text-on-secondary-container',
        error: 'bg-error/10 text-error',
    };

    return (
        <div className="kpi-card flex flex-col gap-2">
            <div className="flex items-center gap-2">
                {icon && (
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accents[accent] || accents.primary}`}>
                        <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                )}
                <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">
                    {label}
                </span>
            </div>
            <span className="font-display text-xl text-on-surface font-bold leading-none">{value}</span>
            {sublabel && <span className="text-[0.6875rem] text-on-surface-variant">{sublabel}</span>}
        </div>
    );
}
