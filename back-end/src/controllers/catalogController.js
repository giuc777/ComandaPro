function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

export function createCatalogController(pool) {
    return {
        // ========================
        // GRUPOS
        // ========================

        async listGroups(req, res) {
            try {
                const [rows] = await pool.query('CALL sp_list_catalog_groups()');
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listGroups:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getGroup(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_catalog_group(?)', [id]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createGroup(req, res) {
            try {
                const { name, slug, description, icon, color, sort_order } = req.body;

                if (!name || !slug) {
                    return res.status(400).json({ error: 'Nombre y slug requeridos' });
                }

                // Validar slug unico
                const [slugCheck] = await pool.query('CALL sp_check_catalog_slug_unique(?, ?)', [slug, null]);
                if (Number(slugCheck[0].cnt) > 0) {
                    return res.status(409).json({ error: 'El slug ya existe' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_catalog_group(?, ?, ?, ?, ?, ?)',
                    [name, slug, description || null, icon || null, color || null, sort_order || 0]
                );

                const groupId = Number(result[0].id);

                res.status(201).json({ id: groupId, name, slug, description, sort_order: sort_order || 0, active: true });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'El slug ya existe' });
                }
                console.error('Error in createGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateGroup(req, res) {
            try {
                const { id } = req.params;
                const { name, description, icon, color, sort_order, active } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_catalog_group(?, ?, ?, ?, ?, ?, ?)',
                    [id, name, description || null, icon || null, color || null, sort_order || 0, active !== false]
                );

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in updateGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteGroup(req, res) {
            try {
                const { id } = req.params;

                const [result] = await pool.query('CALL sp_delete_catalog_group(?)', [id]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        // ========================
        // ÍTEMS
        // ========================

        async listItemsByGroup(req, res) {
            try {
                const { slug } = req.params;
                const [rows] = await pool.query('CALL sp_list_catalog_items_by_group(?)', [slug]);
                res.json(toJSON(rows));
            } catch (error) {
                console.error('Error in listItemsByGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getItem(req, res) {
            try {
                const { id } = req.params;
                const [rows] = await pool.query('CALL sp_get_catalog_item(?)', [id]);

                if (!rows || rows.length === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json(toJSON(rows[0]));
            } catch (error) {
                console.error('Error in getItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createItem(req, res) {
            try {
                const { group_id, name, description, icon, color, parent_id, sort_order } = req.body;

                if (!group_id || !name) {
                    return res.status(400).json({ error: 'group_id y nombre requeridos' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_catalog_item(?, ?, ?, ?, ?, ?, ?)',
                    [group_id, name, description || null, icon || null, color || null, parent_id || null, sort_order || 0]
                );

                const itemId = Number(result[0].id);

                res.status(201).json({
                    id: itemId, group_id, name, description, icon, color,
                    parent_id, sort_order: sort_order || 0, active: true
                });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Ya existe un item con ese nombre en este grupo' });
                }
                console.error('Error in createItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async updateItem(req, res) {
            try {
                const { id } = req.params;
                const { name, description, icon, color, parent_id, sort_order, active } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_catalog_item(?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, name, description || null, icon || null, color || null, parent_id || null, sort_order || 0, active !== false]
                );

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Ya existe un item con ese nombre en este grupo' });
                }
                console.error('Error in updateItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async deleteItem(req, res) {
            try {
                const { id } = req.params;

                const [result] = await pool.query('CALL sp_delete_catalog_item(?)', [id]);

                if (Number(result[0].affected) === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
