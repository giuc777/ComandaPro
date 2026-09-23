function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createInventoryController(pool) {
    return {

        async listInventory(req, res) {
            try {
                const lowStock = req.query.lowStock === 'true';
                const [rows] = await pool.query('CALL sp_list_inventory(?)', [lowStock]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listInventory:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getInventoryItem(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_inventory_item(?)', [id]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Insumo no encontrado' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getInventoryItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createInventoryItem(req, res) {
            try {
                const { catalog_item_id, name, unit, stock, min_stock, cost_per_unit, supplier_id } = req.body;

                if (!name || !unit) {
                    return res.status(400).json({ error: 'Nombre y unidad requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_inventory_item(?, ?, ?, ?, ?, ?, ?)',
                    [
                        catalog_item_id || null,
                        name,
                        unit,
                        Number(stock) || 0,
                        Number(min_stock) || 0,
                        Number(cost_per_unit) || 0,
                        supplier_id || null
                    ]
                );

                const itemId = Number(result[0].id);

                res.status(201).json({
                    id: itemId, catalog_item_id, name, unit,
                    stock: Number(stock) || 0, min_stock: Number(min_stock) || 0,
                    cost_per_unit: Number(cost_per_unit) || 0, supplier_id
                });
            } catch (error) {
                console.error('Error in createInventoryItem:', error.message);
                if (error.message && error.message.includes('catalog_item_id')) {
                    return res.status(400).json({ error: 'catalog_item_id no pertenece a ingredientes_principales' });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateInventoryItem(req, res) {
            try {
                const { id } = req.params;
                const { name, unit, min_stock, cost_per_unit, supplier_id } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_inventory_item(?, ?, ?, ?, ?, ?)',
                    [id, name, unit, Number(min_stock) || 0, Number(cost_per_unit) || 0, supplier_id || null]
                );

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Insumo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateInventoryItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateStock(req, res) {
            try {
                const { id } = req.params;
                const { stock } = req.body;

                if (stock === undefined || stock === null) {
                    return res.status(400).json({ error: 'Stock requerido' });
                }

                const [result] = await pool.query('CALL sp_update_stock(?, ?)', [id, Number(stock)]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Insumo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateStock:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteInventoryItem(req, res) {
            try {
                const { id } = req.params;

                const [result] = await pool.query('CALL sp_delete_inventory_item(?)', [id]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Insumo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteInventoryItem:', error.message);
                if (error.message && error.message.includes('recetas activas')) {
                    return res.status(400).json({ error: 'No se puede eliminar: el insumo tiene recetas activas' });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
