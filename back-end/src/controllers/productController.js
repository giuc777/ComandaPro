function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

function parseRecipe(raw) {
    if (raw === undefined || raw === null || raw === '') {
        return { error: 'El producto debe tener al menos un insumo en su receta' };
    }

    let parsed;
    try {
        parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
        return { error: 'Receta invalida' };
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        return { error: 'El producto debe tener al menos un insumo en su receta' };
    }

    const clean = parsed
        .filter(r => r && r.inventory_id && Number(r.quantity) > 0)
        .map(r => ({
            inventory_id: Number(r.inventory_id),
            quantity: Number(r.quantity),
            unit: r.unit || null
        }));

    if (clean.length === 0) {
        return { error: 'La receta debe tener insumos con cantidad mayor a 0' };
    }

    const unique = new Set(clean.map(r => r.inventory_id));
    if (unique.size !== clean.length) {
        return { error: 'No se puede repetir un insumo en la receta' };
    }

    return { recipe: clean };
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
            let conn;
            try {
                const { name, category_id, price, cost, description, badge, sort_order } = req.body;
                const image = req.file ? req.file.filename : null;

                if (!name || price === undefined) {
                    return res.status(400).json({ error: 'Nombre y precio requeridos' });
                }

                const parsed = parseRecipe(req.body.recipe);
                if (parsed.error) {
                    return res.status(400).json({ error: parsed.error });
                }

                conn = await pool.getConnection();
                await conn.beginTransaction();

                const [result] = await conn.query(
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

                await conn.query(
                    'CALL sp_set_product_recipe(?, ?)',
                    [productId, JSON.stringify(parsed.recipe)]
                );

                await conn.commit();

                res.status(201).json({
                    id: productId, name, category_id, price, cost,
                    description, badge, image, sort_order: Number(sort_order) || 0,
                    active: true, recipe_count: parsed.recipe.length
                });
            } catch (error) {
                console.error('Error in createProduct:', error.message);
                if (conn) await conn.rollback();
                if (error.sqlState === '45000') {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            } finally {
                if (conn) conn.release();
            }
        },

        async updateProduct(req, res) {
            let conn;
            try {
                const { id } = req.params;
                const { name, category_id, price, cost, description, badge, sort_order, active } = req.body;
                const image = req.file ? req.file.filename : (req.body.image || null);

                let recipeToSet = null;
                if (req.body.recipe !== undefined && req.body.recipe !== null && req.body.recipe !== '') {
                    const parsed = parseRecipe(req.body.recipe);
                    if (parsed.error) {
                        return res.status(400).json({ error: parsed.error });
                    }
                    recipeToSet = parsed.recipe;
                }

                conn = await pool.getConnection();
                await conn.beginTransaction();

                await conn.query(
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

                if (recipeToSet) {
                    await conn.query(
                        'CALL sp_set_product_recipe(?, ?)',
                        [Number(id), JSON.stringify(recipeToSet)]
                    );
                }

                await conn.commit();

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateProduct:', error.message);
                if (conn) await conn.rollback();
                if (error.sqlState === '45000') {
                    return res.status(400).json({ error: error.message });
                }
                res.status(500).json({ error: 'Error del servidor' });
            } finally {
                if (conn) conn.release();
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
