function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

function rowsOf(result) {
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return result[0];
    }
    return result || [];
}

function singleRow(result) {
    return rowsOf(result)[0] || {};
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function normalizeTrend(rows) {
    return rows.map((r) => ({
        ...r,
        sale_date: r.sale_date instanceof Date
            ? r.sale_date.toISOString().slice(0, 10)
            : String(r.sale_date).slice(0, 10)
    }));
}

export function createReportController(pool) {
    return {

        async getDailyReport(req, res) {
            try {
                const date = req.query.date || todayISO();
                const startDate = req.query.start || date;
                const endDate = req.query.end || date;

                const summaryResult = await pool.query(
                    'CALL sp_get_sales_summary_range(?, ?)', [startDate, endDate]
                );
                const summary = singleRow(summaryResult);

                const hourlyResult = await pool.query('CALL sp_get_hourly_sales(?)', [date]);
                const hourly = rowsOf(hourlyResult);

                const rankingResult = await pool.query(
                    'CALL sp_get_product_ranking(?, ?, ?)', [startDate, endDate, 10]
                );
                const ranking = rowsOf(rankingResult);

                const categoryResult = await pool.query(
                    'CALL sp_get_category_sales(?, ?)', [startDate, endDate]
                );
                const categories = rowsOf(categoryResult);

                const totalSales = Number(summary.total_sales) || 0;
                const transactionCount = Number(summary.transaction_count) || 0;

                res.json(toJSON({
                    date,
                    summary: {
                        total_sales: totalSales,
                        cash_sales: Number(summary.cash_sales) || 0,
                        card_sales: Number(summary.card_sales) || 0,
                        qr_sales: Number(summary.qr_sales) || 0,
                        transaction_count: transactionCount,
                        avg_ticket: transactionCount > 0 ? totalSales / transactionCount : 0
                    },
                    hourly,
                    ranking,
                    categories
                }));
            } catch (error) {
                console.error('Error in getDailyReport:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getProductRanking(req, res) {
            try {
                const limit = Number(req.query.limit) || 10;
                const end = req.query.end || todayISO();
                const start = req.query.start || end;
                const result = await pool.query(
                    'CALL sp_get_product_ranking(?, ?, ?)', [start, end, limit]
                );
                res.json(toJSON(rowsOf(result)));
            } catch (error) {
                console.error('Error in getProductRanking:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getHourlySales(req, res) {
            try {
                const date = req.query.date || todayISO();
                const result = await pool.query('CALL sp_get_hourly_sales(?)', [date]);
                res.json(toJSON(rowsOf(result)));
            } catch (error) {
                console.error('Error in getHourlySales:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getCategorySales(req, res) {
            try {
                const end = req.query.end || todayISO();
                const start = req.query.start || end;
                const result = await pool.query('CALL sp_get_category_sales(?, ?)', [start, end]);
                res.json(toJSON(rowsOf(result)));
            } catch (error) {
                console.error('Error in getCategorySales:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getSalesTrend(req, res) {
            try {
                const end = req.query.end || todayISO();
                const start = req.query.start
                    || new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
                const result = await pool.query('CALL sp_get_sales_trend(?, ?)', [start, end]);
                res.json(toJSON(normalizeTrend(rowsOf(result))));
            } catch (error) {
                console.error('Error in getSalesTrend:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getPeriodComparison(req, res) {
            try {
                const date = req.query.date || todayISO();
                const result = await pool.query('CALL sp_get_period_comparison(?)', [date]);
                const row = singleRow(result);

                const pct = (current, previous) => {
                    if (!previous || previous === 0) return current > 0 ? 100 : 0;
                    return ((current - previous) / previous) * 100;
                };

                const todaySales = Number(row.today_sales) || 0;
                const yesterdaySales = Number(row.yesterday_sales) || 0;
                const weekSales = Number(row.week_sales) || 0;
                const lastWeekSales = Number(row.last_week_sales) || 0;

                res.json(toJSON({
                    date,
                    day: {
                        current: todaySales,
                        previous: yesterdaySales,
                        change_pct: pct(todaySales, yesterdaySales),
                        transactions: Number(row.today_transactions) || 0,
                        previous_transactions: Number(row.yesterday_transactions) || 0
                    },
                    week: {
                        current: weekSales,
                        previous: lastWeekSales,
                        change_pct: pct(weekSales, lastWeekSales),
                        transactions: Number(row.week_transactions) || 0,
                        previous_transactions: Number(row.last_week_transactions) || 0
                    }
                }));
            } catch (error) {
                console.error('Error in getPeriodComparison:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getCashClosing(req, res) {
            try {
                const shiftId = Number(req.query.shiftId || req.query.shift_id);
                if (!shiftId) {
                    return res.status(400).json({ error: 'shiftId es requerido' });
                }
                const result = await pool.query('CALL sp_get_cash_closing(?)', [shiftId]);
                const shift = singleRow(result);
                if (!shift || shift.id === undefined) {
                    return res.status(404).json({ error: 'Turno no encontrado' });
                }
                res.json(toJSON(shift));
            } catch (error) {
                console.error('Error in getCashClosing:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getDashboard(req, res) {
            try {
                const summaryResult = await pool.query('CALL sp_get_dashboard_summary()');
                const summary = singleRow(summaryResult);

                const trendResult = await pool.query(
                    'CALL sp_get_sales_trend(?, ?)',
                    [new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), todayISO()]
                );
                const trend = rowsOf(trendResult);
                const ordersResult = await pool.query(
                    `SELECT o.id, o.table_id, t.name AS table_name, o.customer_name, o.mode,
                            o.notes, o.subtotal, o.tax, o.total, o.created_at,
                            (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
                     FROM orders o
                     LEFT JOIN tables t ON o.table_id = t.id
                     WHERE o.status = 'pausada'
                     ORDER BY o.created_at DESC
                     LIMIT 10`
                );
                const activeOrders = rowsOf(ordersResult);

                const lowStockResult = await pool.query(
                    `SELECT id, name, stock, unit, min_stock
                     FROM inventory
                     WHERE stock <= min_stock
                     ORDER BY (stock - min_stock) ASC
                     LIMIT 10`
                );
                const lowStock = rowsOf(lowStockResult);

                res.json(toJSON({
                    summary: {
                        today_sales: Number(summary.today_sales) || 0,
                        today_transactions: Number(summary.today_transactions) || 0,
                        today_orders: Number(summary.today_orders) || 0,
                        pending_orders: Number(summary.pending_orders) || 0,
                        low_stock_count: Number(summary.low_stock_count) || 0,
                        avg_ticket: Number(summary.avg_ticket) || 0
                    },
                    trend: normalizeTrend(trend),
                    activeOrders,
                    lowStock
                }));
            } catch (error) {
                console.error('Error in getDashboard:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
