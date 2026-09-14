export function createUserController(pool, tokenService) {
    return {
        async list(req, res) {
            try {
                const [rows] = await pool.query('CALL sp_list_users()');
                res.json(rows);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async create(req, res) {
            try {
                const { username, password, name, email, role } = req.body;

                if (!username || !password || !name) {
                    return res.status(400).json({ error: 'Username, password y nombre requeridos' });
                }

                if (password.length < 8) {
                    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
                }

                const passwordHash = await tokenService.hashPassword(password);

                const [result] = await pool.query(
                    'CALL sp_create_user(?, ?, ?, ?, ?)',
                    [username, passwordHash, name, email || null, role || 'Barista']
                );

                const userId = result[0][0].id;

                res.status(201).json({ id: userId, username, name, email, role: role || 'Barista' });
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'El username ya existe' });
                }
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async update(req, res) {
            try {
                const { id } = req.params;
                const { name, email, role, active } = req.body;

                const [result] = await pool.query(
                    'CALL sp_update_user(?, ?, ?, ?, ?)',
                    [id, name, email, role, active !== false]
                );

                if (result[0].affected === 0) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async delete(req, res) {
            try {
                const { id } = req.params;

                if (parseInt(id) === req.user.id) {
                    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
                }

                const [result] = await pool.query(
                    'CALL sp_update_user(?, ?, ?, ?, ?)',
                    [id, null, null, null, false]
                );

                if (result[0].affected === 0) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
