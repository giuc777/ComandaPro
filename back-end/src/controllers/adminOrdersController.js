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

export function createAdminOrdersController(pool) {
    return {

        async list(req, res) {
            try {
                const status = req.query.status || '';
                const rawLimit = Number(req.query.limit);
                const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 50;

                const [rows] = await pool.query('CALL sp_get_orders_admin(?, ?)', [status, limit]);
                res.json(groupByOrder(rows));
            } catch (error) {
                console.error('Error in listOrders:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async get(req, res) {
            try {
                const { id } = req.params;
                const result = await pool.query('CALL sp_get_order(?)', [Number(id)]);

                const orderRows = result[0];
                const itemRows = result[1] || [];

                if (!orderRows || orderRows.length === 0) {
                    return res.status(404).json({ error: 'Orden no encontrada' });
                }

                const order = toJSON(orderRows[0]);
                order.items = toJSON(itemRows);

                res.json(order);
            } catch (error) {
                console.error('Error in getOrder:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
