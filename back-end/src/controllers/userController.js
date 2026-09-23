function toJSON(data) {
    return JSON.parse(JSON.stringify(data, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value
    ));
}

function rowsOf(result) {
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return result[0];
    }
    return result || [];
}

function singleRow(result) {
    return rowsOf(result)[0] || {};
}

export function createUserController(pool, tokenService) {
    return {
        async list(req, res) {
            try {
                const [result] = await pool.query('CALL sp_list_users_admin()');
                res.json(toJSON(rowsOf(result)));
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

                const validRoles = ['Administrador', 'Barista', 'Cajero'];
                const userRole = validRoles.includes(role) ? role : 'Barista';

                const passwordHash = await tokenService.hashPassword(password);

                const [result] = await pool.query(
                    'CALL sp_create_user(?, ?, ?, ?, ?)',
                    [username, passwordHash, name, email || null, userRole]
                );

                const userId = Number(singleRow(result).id);

                res.status(201).json({ id: userId, username, name, email, role: userRole });
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

                const activeParam = active === undefined ? null : (active ? 1 : 0);
                const emailParam = email === undefined ? null : email;

                const [result] = await pool.query(
                    'CALL sp_update_user(?, ?, ?, ?, ?)',
                    [id, name || null, emailParam, role || null, activeParam]
                );

                const affected = Number(singleRow(result).affected);

                if (affected === 0) {
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
                    'CALL sp_set_user_active(?, ?)',
                    [id, false]
                );

                const affected = Number(singleRow(result).affected);

                if (affected === 0) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async setPassword(req, res) {
            try {
                const { id } = req.params;
                const { password } = req.body;

                if (!password) {
                    return res.status(400).json({ error: 'Contraseña requerida' });
                }

                if (password.length < 8) {
                    return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
                }

                const passwordHash = await tokenService.hashPassword(password);

                const [result] = await pool.query(
                    'CALL sp_change_password(?, ?)',
                    [id, passwordHash]
                );

                const affected = Number(singleRow(result).affected);

                if (affected === 0) {
                    return res.status(404).json({ error: 'Usuario no encontrado' });
                }

                res.json({ success: true, message: 'Contraseña actualizada' });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async unlock(req, res) {
            try {
                const { id } = req.params;

                await pool.query('CALL sp_reset_failed_attempts(?)', [id]);

                res.json({ success: true, message: 'Usuario desbloqueado' });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}