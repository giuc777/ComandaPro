function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createRecipeController(pool) {
    return {

        async getProductRecipe(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_product_recipe(?)', [id]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in getProductRecipe:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getRecipeCost(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_product_recipe_cost(?)', [id]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Producto no encontrado' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getRecipeCost:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async upsertRecipeItem(req, res) {
            try {
                const { id } = req.params;
                const { inventory_id, quantity_per_unit, unit } = req.body;

                if (!inventory_id || !quantity_per_unit || !unit) {
                    return res.status(400).json({ error: 'inventory_id, quantity_per_unit y unit requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_upsert_recipe_item(?, ?, ?, ?)',
                    [id, Number(inventory_id), Number(quantity_per_unit), unit]
                );

                res.status(201).json({
                    id: Number(result[0].id),
                    product_id: Number(id),
                    inventory_id: Number(inventory_id),
                    quantity_per_unit: Number(quantity_per_unit),
                    unit
                });
            } catch (error) {
                console.error('Error in upsertRecipeItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteRecipeItem(req, res) {
            try {
                const { recipeId } = req.params;

                const [result] = await pool.query('CALL sp_delete_recipe_item(?)', [recipeId]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Ingrediente no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteRecipeItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
