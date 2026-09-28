function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

function groupByOrder(rows) {
    const orders = new Map();

    for (const row of rows || []) {
        const { order_id, item_id, product_id, product_name, quantity,
            unit_price, modifier_labels, notes, sent, prepared_at, ...header } = row;
        const id = Number(order_id);

        let order = orders.get(id);
        if (!order) {
            order = { id, ...toJSON(header), items: [] };
            orders.set(id, order);
        }

        if (item_id !== null && item_id !== undefined) {
            order.items.push(toJSON({
                item_id, product_id, product_name, quantity,
                unit_price, modifier_labels, notes, sent, prepared_at
            }));
        }
    }

    return [...orders.values()];
}

export function createKdsController(pool) {
    return {

        async listOrders(req, res) {
            try {
                const status = req.query.status || '';
                const [rows] = await pool.query('CALL sp_get_kds_orders(?)', [status]);
                res.json(groupByOrder(rows));
            } catch (error) {
                console.error('Error in listOrders:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateStatus(req, res) {
            const allowed = ['enviada', 'preparando', 'lista', 'completada'];
            const { status } = req.body || {};

            if (!allowed.includes(status)) {
                return res.status(400).json({ error: `status debe ser: ${allowed.join(', ')}` });
            }

            try {
                const { id } = req.params;
                const [rows] = await pool.query(
                    'CALL sp_update_order_status(?, ?)',
                    [Number(id), status]
                );

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in updateStatus:', error.message);
                if (error.sqlState === '45000') {
                    return res.status(409).json({ error: error.sqlMessage || error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
