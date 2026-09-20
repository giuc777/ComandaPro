function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createProductController(pool) {
    return {

        async listProducts(req, res) {
            try {
                const category_id = req.query.category ? Number(req.query.category) : null;
                const [rows] = await pool.query('CALL sp_list_products(?)', [category_id]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listProducts:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getProduct(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_product(?)', [id]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Producto no encontrado' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getProduct:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createProduct(req, res) {
            try {
                const { name, category_id, price, cost, description, badge, sort_order } = req.body;
                const image = req.file ? req.file.filename : null;

                if (!name || price === undefined) {
                    return res.status(400).json({ error: 'Nombre y precio requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_product(?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        name,
                        category_id || null,
                        Number(price),
                        Number(cost) || 0,
                        description || null,
                        badge || null,
                        image,
                        Number(sort_order) || 0
                    ]
                );

                const productId = Number(result[0].id);

                res.status(201).json({
                    id: productId, name, category_id, price, cost,
                    description, badge, image, sort_order: Number(sort_order) || 0,
                    active: true
                });
            } catch (error) {
                console.error('Error in createProduct:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateProduct(req, res) {
            try {
                const { id } = req.params;
                const { name, category_id, price, cost, description, badge, sort_order, active } = req.body;
                const image = req.file ? req.file.filename : (req.body.image || null);

                const [result] = await pool.query(
                    'CALL sp_update_product(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        id,
                        name,
                        category_id || null,
                        Number(price),
                        Number(cost) || 0,
                        description || null,
                        badge || null,
                        image,
                        Number(sort_order) || 0,
                        active !== false
                    ]
                );

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Producto no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateProduct:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteProduct(req, res) {
            try {
                const { id } = req.params;

                const [result] = await pool.query('CALL sp_delete_product(?)', [id]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Producto no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteProduct:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
