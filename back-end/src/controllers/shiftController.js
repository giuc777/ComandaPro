function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createShiftController(pool) {
    return {

        async openShift(req, res) {
            const { start_cash, station } = req.body;
            const cashier_id = req.user?.id;

            if (start_cash === undefined || start_cash === null) {
                return res.status(400).json({ error: 'start_cash es requerido' });
            }

            try {
                const [result] = await pool.query(
                    'CALL sp_open_shift(?, ?, ?)',
                    [cashier_id, Number(start_cash), station || 'Estacion 01']
                );
                const row = result[0];
                res.status(201).json({
                    shift_id: Number(row.shift_id),
                    message: 'Turno abierto correctamente'
                });
            } catch (error) {
                console.error('Error in openShift:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async closeShift(req, res) {
            const { id } = req.params;
            const { actual_cash } = req.body;

            if (actual_cash === undefined || actual_cash === null) {
                return res.status(400).json({ error: 'actual_cash es requerido' });
            }

            try {
                const [result] = await pool.query(
                    'CALL sp_close_shift(?, ?)',
                    [Number(id), Number(actual_cash)]
                );
                const row = result[0];
                res.json({
                    expected_cash: Number(row.expected_cash),
                    actual_cash: Number(row.actual_cash),
                    difference: Number(row.difference),
                    total_sales: Number(row.total_sales),
                    cash_sales: Number(row.cash_sales),
                    card_sales: Number(row.card_sales),
                    qr_sales: Number(row.qr_sales),
                    transaction_count: Number(row.transaction_count),
                    message: 'Turno cerrado correctamente'
                });
            } catch (error) {
                console.error('Error in closeShift:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getCurrentShift(req, res) {
            try {
                const [rows] = await pool.query('CALL sp_get_current_shift()');
                const shift = rows[0];
                if (!shift) {
                    return res.json(null);
                }
                res.json(toJSON(shift));
            } catch (error) {
                console.error('Error in getCurrentShift:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getShiftHistory(req, res) {
            try {
                const limit = Number(req.query.limit) || 20;
                const [rows] = await pool.query('CALL sp_get_shift_history(?)', [limit]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in getShiftHistory:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getArqueo(req, res) {
            const { id } = req.params;
            try {
                const [rows] = await pool.query('CALL sp_get_arqueo_breakdown(?)', [Number(id)]);
                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getArqueo:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getShiftTransactions(req, res) {
            const { id } = req.params;
            try {
                const [rows] = await pool.query('CALL sp_get_shift_transactions(?)', [Number(id)]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in getShiftTransactions:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async recordShiftTransaction(req, res) {
            const { id } = req.params;
            const { order_id, type, method, amount } = req.body;

            if (!type || !method || amount === undefined) {
                return res.status(400).json({ error: 'type, method y amount son requeridos' });
            }

            try {
                await pool.query(
                    'CALL sp_record_shift_transaction(?, ?, ?, ?, ?)',
                    [Number(id), order_id ? Number(order_id) : null, type, method, Number(amount)]
                );
                res.status(201).json({ message: 'Transaccion registrada' });
            } catch (error) {
                console.error('Error in recordShiftTransaction:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
