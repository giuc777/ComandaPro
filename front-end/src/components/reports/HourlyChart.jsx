import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { formatCurrency, formatCompactCurrency, formatHour } from '../../utils/format';

function buildSeries(data) {
    const byHour = {};
    (data || []).forEach((row) => {
        byHour[Number(row.sale_hour)] = {
            transactions: Number(row.transaction_count) || 0,
            total: Number(row.total_sales) || 0,
        };
    });

    const series = [];
    for (let h = 6; h <= 23; h += 1) {
        series.push({
            hour: h,
            label: formatHour(h),
            transactions: byHour[h]?.transactions || 0,
            total: byHour[h]?.total || 0,
        });
    }
    return series;
}

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-[0.75rem] font-bold text-on-surface">{label}</p>
            <p className="text-[0.75rem] text-primary font-semibold">{formatCurrency(point.total)}</p>
            <p className="text-[0.6875rem] text-on-surface-variant">{point.transactions} transacciones</p>
        </div>
    );
}

export default function HourlyChart({ data }) {
    const series = buildSeries(data);
    const hasData = series.some((s) => s.total > 0);

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-on-surface font-semibold">Ventas por Hora</h3>
                <span className="material-symbols-outlined text-outline text-[20px]">schedule</span>
            </div>

            {!hasData ? (
                <div className="h-56 flex items-center justify-center text-on-surface-variant text-sm">
                    Sin ventas registradas este dia
                </div>
            ) : (
                <div className="h-56 -ml-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(84,51,16,0.08)" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#82756a' }}
                                tickLine={false}
                                axisLine={false}
                                interval={1}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#82756a' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatCompactCurrency}
                                width={44}
                            />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(84,51,16,0.05)' }} />
                            <Bar dataKey="total" fill="#543310" radius={[6, 6, 0, 0]} maxBarSize={26} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
