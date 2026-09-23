import { formatCurrency, formatPercent } from '../../utils/format';

function ComparisonCard({ title, icon, current, previous, changePct, previousLabel }) {
    const positive = Number(changePct) >= 0;
    return (
        <div className="kpi-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-container/10 text-primary-container">
                    <span className="material-symbols-outlined text-[18px]">{icon}</span>
                </div>
                <span className="text-[0.6875rem] uppercase tracking-wider text-on-surface-variant font-bold">{title}</span>
            </div>

            <div className="flex items-end justify-between gap-2">
                <div>
                    <span className="font-display text-xl text-on-surface font-bold block leading-none">
                        {formatCurrency(current)}
                    </span>
                    <span className="text-[0.6875rem] text-on-surface-variant">
                        vs {formatCurrency(previous)} {previousLabel}
                    </span>
                </div>
                <span className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-[0.6875rem] font-bold ${positive ? 'bg-tertiary-container/15 text-tertiary' : 'bg-error/10 text-error'}`}>
                    <span className="material-symbols-outlined text-[14px]">
                        {positive ? 'trending_up' : 'trending_down'}
                    </span>
                    {formatPercent(changePct)}
                </span>
            </div>
        </div>
    );
}

export default function PeriodComparison({ data }) {
    if (!data) return null;
    const { day, week } = data;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ComparisonCard
                title="Hoy vs Ayer"
                icon="today"
                current={day?.current}
                previous={day?.previous}
                changePct={day?.change_pct}
                previousLabel="ayer"
            />
            <ComparisonCard
                title="Semana vs Anterior"
                icon="date_range"
                current={week?.current}
                previous={week?.previous}
                changePct={week?.change_pct}
                previousLabel="sem. ant."
            />
        </div>
    );
}
