function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createPaymentController(pool) {
    return {

        async recordPayment(req, res) {
            const { order_id, method, amount_given, sat_invoice } = req.body;
            const cashier_id = req.user?.id || null;

            if (!order_id || !method) {
                return res.status(400).json({ error: 'order_id y method son requeridos' });
            }

            if (!['efectivo', 'tarjeta', 'qr'].includes(method)) {
                return res.status(400).json({ error: 'method debe ser: efectivo, tarjeta, qr' });
            }

            try {
                const [result] = await pool.query(
                    'CALL sp_record_payment(?, ?, ?, ?, ?)',
                    [Number(order_id), method, amount_given || null, cashier_id, sat_invoice || null]
                );
                const row = result[0];
                res.status(201).json({
                    payment_id: Number(row.payment_id),
                    change_amount: Number(row.change_amount),
                    message: 'Pago registrado'
                });
            } catch (error) {
                console.error('Error in recordPayment:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getPaymentById(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_payment_by_id(?)', [Number(id)]);
                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Pago no encontrado' });
                }
                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getPaymentById:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getDailyPayments(req, res) {
            try {
                const date = req.query.date || new Date().toISOString().slice(0, 10);
                const [rows] = await pool.query('CALL sp_get_daily_payments(?)', [date]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in getDailyPayments:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getDailySalesSummary(req, res) {
            try {
                const date = req.query.date || new Date().toISOString().slice(0, 10);
                const [rows] = await pool.query('CALL sp_get_daily_sales_summary(?)', [date]);
                const summary = rows[0];
                res.json({
                    date,
                    total_sales: Number(summary.total_sales),
                    cash_sales: Number(summary.cash_sales),
                    card_sales: Number(summary.card_sales),
                    qr_sales: Number(summary.qr_sales),
                    transaction_count: Number(summary.transaction_count)
                });
            } catch (error) {
                console.error('Error in getDailySalesSummary:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
