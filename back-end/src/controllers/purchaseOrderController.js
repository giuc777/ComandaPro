function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createPurchaseOrderController(pool) {
    return {

        async listPurchaseOrders(req, res) {
            try {
                const supplierId = req.query.supplier_id ? Number(req.query.supplier_id) : null;
                const status = req.query.status || null;
                const [rows] = await pool.query('CALL sp_list_purchase_orders(?, ?)', [supplierId, status]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listPurchaseOrders:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getPurchaseOrder(req, res) {
            try {
                const { id } = req.params;
                const poResult = await pool.query(
                    `SELECT po.id, po.supplier_id, s.name AS supplier_name, s.contact_name, s.phone,
                            po.status, po.total, po.notes, po.created_at, po.received_at,
                            u.name AS created_by_name
                     FROM purchase_orders po
                     JOIN suppliers s ON po.supplier_id = s.id
                     JOIN users u ON po.created_by = u.id
                     WHERE po.id = ?`, [id]
                );
                const poRows = Array.isArray(poResult[0]) ? poResult[0] : poResult;

                if (!poRows || poRows.length === 0) {
                    return res.status(404).json({ error: 'Orden de compra no encontrada' });
                }

                let itemRows = [];
                try {
                    const itemResult = await pool.query(
                        `SELECT poi.id, poi.inventory_id, i.name AS inventory_name, i.unit,
                                poi.quantity, poi.unit_cost, (poi.quantity * poi.unit_cost) AS line_total
                         FROM purchase_order_items poi
                         JOIN inventory i ON poi.inventory_id = i.id
                         WHERE poi.po_id = ?
                         ORDER BY i.name`, [id]
                    );
                    itemRows = Array.isArray(itemResult[0]) ? itemResult[0] : itemResult;
                } catch (e) {
                    console.error('Error loading PO items:', e.message);
                }

                res.json({
                    order: toJSON(poRows[0]),
                    items: toJSON(itemRows)
                });
            } catch (error) {
                console.error('Error in getPurchaseOrder:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createPurchaseOrder(req, res) {
            try {
                const { supplier_id, notes } = req.body;
                const createdBy = req.user.id;

                if (!supplier_id) {
                    return res.status(400).json({ error: 'supplier_id requerido' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_purchase_order(?, ?, ?)',
                    [Number(supplier_id), notes || null, createdBy]
                );

                const poId = Number(result[0].po_id);
                res.status(201).json({ id: poId, supplier_id: Number(supplier_id), status: 'pending', total: 0 });
            } catch (error) {
                console.error('Error in createPurchaseOrder:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async addPoItem(req, res) {
            try {
                const { id } = req.params;
                const { inventory_id, quantity, unit_cost } = req.body;

                if (!inventory_id || !quantity || !unit_cost) {
                    return res.status(400).json({ error: 'inventory_id, quantity y unit_cost requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_add_po_item(?, ?, ?, ?)',
                    [Number(id), Number(inventory_id), Number(quantity), Number(unit_cost)]
                );

                res.status(201).json({ id: Number(result[0].id) });
            } catch (error) {
                console.error('Error in addPoItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deletePoItem(req, res) {
            try {
                const { itemId } = req.params;

                const [result] = await pool.query('CALL sp_delete_po_item(?)', [itemId]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deletePoItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async receivePurchaseOrder(req, res) {
            try {
                const { id } = req.params;

                await pool.query('CALL sp_receive_purchase_order(?)', [Number(id)]);

                res.json({ success: true });
            } catch (error) {
                console.error('Error in receivePurchaseOrder:', error.message);
                if (error.message && error.message.includes('no encontrada')) {
                    return res.status(404).json({ error: error.message });
                }
                if (error.message && error.message.includes('pendientes')) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async cancelPurchaseOrder(req, res) {
            try {
                const { id } = req.params;

                const [result] = await pool.query('CALL sp_cancel_purchase_order(?)', [Number(id)]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Orden no encontrada o no esta pendiente' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in cancelPurchaseOrder:', error.message);
                if (error.message && error.message.includes('pendientes')) {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
