import { formatCurrency } from '../../utils/format';

export default function ProductRankingTable({ data, limit = 10 }) {
    const rows = (data || []).slice(0, limit);
    const maxSold = rows.reduce((max, row) => Math.max(max, Number(row.total_sold) || 0), 0);

    return (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-on-surface font-semibold">Top Productos</h3>
                <span className="material-symbols-outlined text-outline text-[20px]">leaderboard</span>
            </div>

            {rows.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-sm">
                    Sin productos vendidos en este periodo
                </div>
            ) : (
                <div className="flex flex-col gap-2">
                    {rows.map((product, index) => {
                        const pct = maxSold > 0 ? (Number(product.total_sold) / maxSold) * 100 : 0;
                        return (
                            <div key={product.product_id} className="relative overflow-hidden rounded-xl bg-surface-container">
                                <div
                                    className="absolute inset-y-0 left-0 bg-secondary-container/40"
                                    style={{ width: `${pct}%` }}
                                ></div>
                                <div className="relative flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className={`font-display text-sm font-bold w-6 text-center ${index < 3 ? 'text-primary' : 'text-on-surface-variant'}`}>
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <span className="font-semibold text-[0.8125rem] text-on-surface block truncate">
                                                {product.product_name}
                                            </span>
                                            <span className="text-[0.6875rem] text-on-surface-variant">
                                                {product.category_name} &bull; {product.total_sold} unidades
                                            </span>
                                        </div>
                                    </div>
                                    <span className="font-display text-sm font-bold text-on-surface flex-shrink-0">
                                        {formatCurrency(product.total_revenue)}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
