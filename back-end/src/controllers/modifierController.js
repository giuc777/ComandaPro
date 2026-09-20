function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createModifierController(pool) {
    return {
        // ========================
        // GRUPOS
        // ========================

        async listGroups(req, res) {
            try {
                const [rows] = await pool.query('CALL sp_list_modifier_groups()');
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listGroups:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getGroup(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_modifier_group(?)', [id]);

                if (!rows || !rows.length || !rows[0].length) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                res.json(toJSON(rows[0][0]));
            } catch (error) {
                console.error('Error in getGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createGroup(req, res) {
            try {
                const { name, required, max_selections, display_order } = req.body;

                if (!name || !name.trim()) {
                    return res.status(400).json({ error: 'Nombre requerido' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_modifier_group(?, ?, ?, ?)',
                    [name.trim(), required || false, max_selections || 1, display_order || 0]
                );

                const groupId = Number(result[0][0].id);

                res.status(201).json({
                    id: groupId, name: name.trim(), required: required || false,
                    max_selections: max_selections || 1, display_order: display_order || 0, active: true
                });
            } catch (error) {
                console.error('Error in createGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateGroup(req, res) {
            try {
                const { id } = req.params;
                const { name, required, max_selections, display_order, active } = req.body;

                await pool.query(
                    'CALL sp_update_modifier_group(?, ?, ?, ?, ?, ?)',
                    [id, name, required || false, max_selections || 1, display_order || 0, active !== false]
                );

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteGroup(req, res) {
            try {
                const { id } = req.params;
                await pool.query('CALL sp_delete_modifier_group(?)', [id]);
                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        // ========================
        // OPCIONES
        // ========================

        async listOptions(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_list_modifier_options(?)', [id]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listOptions:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createOption(req, res) {
            try {
                const { group_id, name, price_adjustment, display_order } = req.body;

                if (!group_id || !name || !name.trim()) {
                    return res.status(400).json({ error: 'group_id y nombre requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_modifier_option(?, ?, ?, ?)',
                    [group_id, name.trim(), price_adjustment || 0, display_order || 0]
                );

                const optionId = Number(result[0][0].id);

                res.status(201).json({
                    id: optionId, group_id, name: name.trim(),
                    price_adjustment: price_adjustment || 0, display_order: display_order || 0, active: true
                });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Ya existe una opcion con ese nombre en este grupo' });
                }
                console.error('Error in createOption:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateOption(req, res) {
            try {
                const { id } = req.params;
                const { name, price_adjustment, display_order, active } = req.body;

                await pool.query(
                    'CALL sp_update_modifier_option(?, ?, ?, ?, ?)',
                    [id, name, price_adjustment || 0, display_order || 0, active !== false]
                );

                res.json({ success: true });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Ya existe una opcion con ese nombre en este grupo' });
                }
                console.error('Error in updateOption:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteOption(req, res) {
            try {
                const { id } = req.params;
                await pool.query('CALL sp_delete_modifier_option(?)', [id]);
                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteOption:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        // ========================
        // PRODUCTOS <-> MODIFICADORES
        // ========================

        async getProductModifiers(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_product_modifiers(?)', [id]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in getProductModifiers:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async assignProductModifiers(req, res) {
            try {
                const { id } = req.params;
                const { group_ids } = req.body;

                await pool.query('CALL sp_assign_product_modifier_groups(?, ?)', [id, JSON.stringify(group_ids || [])]);

                res.json({ success: true });
            } catch (error) {
                console.error('Error in assignProductModifiers:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}