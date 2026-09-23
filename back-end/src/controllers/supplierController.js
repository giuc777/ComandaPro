function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createSupplierController(pool) {
    return {

        async listSuppliers(req, res) {
            try {
                const all = req.query.all === 'true';
                const proc = all ? 'sp_list_all_suppliers' : 'sp_list_suppliers';
                const [rows] = await pool.query(`CALL ${proc}()`);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listSuppliers:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getSupplierDetail(req, res) {
            try {
                const { id } = req.params;
                const supplierResult = await pool.query(
                    'SELECT id, name, contact_name, phone, email, address, status, notes FROM suppliers WHERE id = ?', [id]
                );
                const supplierRows = Array.isArray(supplierResult[0]) ? supplierResult[0] : supplierResult;

                if (!supplierRows || supplierRows.length === 0) {
                    return res.status(404).json({ error: 'Proveedor no encontrado' });
                }

                let poRows = [];
                try {
                    const poResult = await pool.query(
                        `SELECT po.id, po.status, po.total, po.notes, po.created_at, po.received_at,
                                u.name AS created_by_name
                         FROM purchase_orders po
                         JOIN users u ON po.created_by = u.id
                         WHERE po.supplier_id = ?
                         ORDER BY po.created_at DESC LIMIT 10`, [id]
                    );
                    poRows = Array.isArray(poResult[0]) ? poResult[0] : poResult;
                } catch (e) {
                    console.error('Error loading POs:', e.message);
                }

                res.json({
                    supplier: toJSON(supplierRows[0]),
                    purchaseOrders: toJSON(poRows)
                });
            } catch (error) {
                console.error('Error in getSupplierDetail:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createSupplier(req, res) {
            try {
                const { name, contact_name, phone, email, address, notes } = req.body;

                if (!name) {
                    return res.status(400).json({ error: 'Nombre requerido' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_supplier(?, ?, ?, ?, ?, ?)',
                    [name, contact_name || null, phone || null, email || null, address || null, notes || null]
                );

                const id = Number(result[0].id);
                res.status(201).json({ id, name, contact_name, phone, email, address, notes, status: 'Activo' });
            } catch (error) {
                console.error('Error in createSupplier:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateSupplier(req, res) {
            try {
                const { id } = req.params;
                const { name, contact_name, phone, email, address, notes, status } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_supplier(?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, name, contact_name || null, phone || null, email || null, address || null, notes || null, status || 'Activo']
                );

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Proveedor no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateSupplier:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
