import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { formatCurrency } from '../../utils/format';

const COLORS = ['#543310', '#7d562d', '#002b26', '#4ab6a7', '#cb9b6f', '#9c4221', '#0061a4'];

function ChartTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload;
    return (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg px-3 py-2 shadow-lg">
            <p className="text-[0.75rem] font-bold text-on-surface">{point.category_name}</p>
            <p className="text-[0.75rem] text-primary font-semibold">{formatCurrency(point.total_revenue)}</p>
            <p className="text-[0.6875rem] text-on-surface-variant">{point.items_sold} items</p>
        </div>
    );
}

export default function CategoryChart({ data }) {
    const series = (data || []).map((row) => ({
        ...row,
        total_revenue: Number(row.total_revenue) || 0,
        items_sold: Number(row.items_sold) || 0,
    }));
    const total = series.reduce((sum, row) => sum + row.total_revenue, 0);

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-on-surface font-semibold">Ventas por Categoria</h3>
                <span className="material-symbols-outlined text-outline text-[20px]">pie_chart</span>
            </div>

            {series.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-on-surface-variant text-sm">
                    Sin datos de categorias
                </div>
            ) : (
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="h-44 w-44 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={series}
                                    dataKey="total_revenue"
                                    nameKey="category_name"
                                    innerRadius={48}
                                    outerRadius={72}
                                    paddingAngle={2}
                                    stroke="none"
                                >
                                    {series.map((entry, index) => (
                                        <Cell key={entry.category_name} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<ChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 w-full flex flex-col gap-2">
                        {series.map((row, index) => {
                            const pct = total > 0 ? (row.total_revenue / total) * 100 : 0;
                            return (
                                <div key={row.category_name} className="flex items-center gap-2.5">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></span>
                                    <span className="flex-1 text-[0.8125rem] text-on-surface truncate">{row.category_name}</span>
                                    <span className="text-[0.6875rem] text-on-surface-variant">{pct.toFixed(0)}%</span>
                                    <span className="text-[0.8125rem] font-semibold text-on-surface w-20 text-right">
                                        {formatCurrency(row.total_revenue)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
