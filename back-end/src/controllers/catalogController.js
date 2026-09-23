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
                const { name, slug, description, icon, color, sort_order, is_modifier, required, max_selections } = req.body;

                if (!name || !slug) {
                    return res.status(400).json({ error: 'Nombre y slug requeridos' });
                }

                const [slugCheck] = await pool.query('CALL sp_check_catalog_slug_unique(?, ?)', [slug, null]);
                if (Number(slugCheck[0].cnt) > 0) {
                    return res.status(409).json({ error: 'El slug ya existe' });
                }

                const [result] = await pool.query(
                    'CALL sp_create_catalog_group(?, ?, ?, ?, ?, ?, ?)',
                    [name, slug, description || null, sort_order || 0, is_modifier || false, required || false, max_selections || 1]
                );

                const groupId = Number(result[0][0].id);

                res.status(201).json({
                    id: groupId, name, slug, description, sort_order: sort_order || 0,
                    is_modifier: is_modifier || false, required: required || false,
                    max_selections: max_selections || 1, active: true
                });
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
                const { name, description, icon, color, sort_order, active, is_modifier, required, max_selections } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_catalog_group(?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, name, description || null, sort_order || 0, active !== false, is_modifier || false, required || false, max_selections || 1]
                );

                if (Number(result[0][0].affected) === 0) {
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

                if (Number(result[0][0].affected) === 0) {
                    return res.status(404).json({ error: 'Grupo no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteGroup:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        // ========================
        // ITEMS
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

                if (!rows || !rows.length || !rows[0].length) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json(toJSON(rows[0][0]));
            } catch (error) {
                console.error('Error in getItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async createItem(req, res) {
            try {
                const { group_id, name, description, icon, color, parent_id, sort_order, price_adjustment, capacity } = req.body;

                if (!group_id || !name) {
                    return res.status(400).json({ error: 'group_id y nombre requeridos' });
                }

                // Check if this is the "mesas" group
                const groupResult = await pool.query('SELECT slug FROM catalog_groups WHERE id = ?', [group_id]);
                const groupRows = Array.isArray(groupResult[0]) ? groupResult[0] : groupResult;
                const isMesas = groupRows[0]?.slug === 'mesas';

                if (isMesas) {
                    const [result] = await pool.query(
                        'CALL sp_create_mesa_with_table(?, ?, ?, ?, ?, ?, ?)',
                        [group_id, name, description || null, icon || null, color || null, sort_order || 0, capacity || 4]
                    );
                    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
                    const itemId = Number(row.item_id);
                    return res.status(201).json({
                        id: itemId, group_id, name, description, icon, color,
                        sort_order: sort_order || 0, capacity: capacity || 4, active: true
                    });
                }

                const [result] = await pool.query(
                    'CALL sp_create_catalog_item(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [group_id, name, description || null, icon || null, color || null, parent_id || null, sort_order || 0, price_adjustment || 0, capacity || null, null]
                );

                const itemId = Number(result[0][0].id);

                res.status(201).json({
                    id: itemId, group_id, name, description, icon, color,
                    parent_id, sort_order: sort_order || 0, price_adjustment: price_adjustment || 0, capacity: capacity || null, active: true
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
                const { name, description, icon, color, parent_id, sort_order, active, price_adjustment, capacity } = req.body;

                // Check if this item belongs to "mesas" group
                const itemResult = await pool.query(
                    'SELECT ci.id, cg.slug FROM catalog_items ci JOIN catalog_groups cg ON ci.group_id = cg.id WHERE ci.id = ?', [id]
                );
                const itemRows = Array.isArray(itemResult[0]) ? itemResult[0] : itemResult;
                const isMesas = itemRows[0]?.slug === 'mesas';

                if (isMesas) {
                    const [result] = await pool.query(
                        'CALL sp_update_mesa_with_table(?, ?, ?, ?, ?, ?, ?, ?)',
                        [id, name, description || null, icon || null, color || null, sort_order || 0, active !== false, capacity || null]
                    );
                    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
                    if (Number(row.affected) === 0) {
                        return res.status(404).json({ error: 'Item no encontrado' });
                    }
                    return res.json({ success: true });
                }

                const [result] = await pool.query(
                    'CALL sp_update_catalog_item(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [id, name, description || null, icon || null, color || null, parent_id || null, sort_order || 0, active !== false, price_adjustment || 0, capacity || null, null]
                );

                if (Number(result[0][0].affected) === 0) {
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

                // Check if this item belongs to "mesas" group
                const itemResult = await pool.query(
                    'SELECT ci.id, cg.slug FROM catalog_items ci JOIN catalog_groups cg ON ci.group_id = cg.id WHERE ci.id = ?', [id]
                );
                const itemRows = Array.isArray(itemResult[0]) ? itemResult[0] : itemResult;
                const isMesas = itemRows[0]?.slug === 'mesas';

                if (isMesas) {
                    const [result] = await pool.query('CALL sp_delete_mesa_with_table(?)', [id]);
                    const row = Array.isArray(result[0]) ? result[0][0] : result[0];
                    if (Number(row.affected) === 0) {
                        return res.status(404).json({ error: 'Item no encontrado' });
                    }
                    return res.json({ success: true });
                }

                const [result] = await pool.query('CALL sp_delete_catalog_item(?)', [id]);

                if (Number(result[0][0].affected) === 0) {
                    return res.status(404).json({ error: 'Item no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                console.error('Error in deleteItem:', error.message);
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        // ========================
        // MODIFICADORES POR PRODUCTO
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