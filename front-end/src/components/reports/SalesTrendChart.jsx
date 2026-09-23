import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { formatCurrency, formatCompactCurrency, formatDateLabel } from '../../utils/format';

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-[0.75rem] font-bold text-on-surface">{formatDateLabel(point.sale_date) || label}</p>
            <p className="text-[0.75rem] text-primary font-semibold">{formatCurrency(point.total_sales)}</p>
            <p className="text-[0.6875rem] text-on-surface-variant">{point.transaction_count} transacciones</p>
        </div>
    );
}

export default function SalesTrendChart({ data, title = 'Tendencia de Ventas', height = 200 }) {
    const series = (data || []).map((row) => ({
        ...row,
        label: formatDateLabel(row.sale_date),
        total_sales: Number(row.total_sales) || 0,
        transaction_count: Number(row.transaction_count) || 0,
    }));

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-on-surface font-semibold">{title}</h3>
                <span className="material-symbols-outlined text-outline text-[20px]">show_chart</span>
            </div>

            {series.length === 0 ? (
                <div className="flex items-center justify-center text-on-surface-variant text-sm" style={{ height }}>
                    Sin datos de ventas
                </div>
            ) : (
                <div className="-ml-2" style={{ height }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                            <defs>
                                <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#543310" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#543310" stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(84,51,16,0.08)" />
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 10, fill: '#82756a' }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#82756a' }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatCompactCurrency}
                                width={44}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="total_sales"
                                stroke="#543310"
                                strokeWidth={2.5}
                                fill="url(#salesTrendFill)"
                                dot={{ r: 3, fill: '#543310' }}
                                activeDot={{ r: 5 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
