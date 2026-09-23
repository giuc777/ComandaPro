import { clearPermissionsCache } from '../middleware/auth.js';

function rowsOf(result) {
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return result[0];
    }
    return result || [];
}

export function createPermissionsController(pool) {
    return {
        async getAll(req, res) {
            try {
                const [result] = await pool.query('CALL sp_get_role_permissions()');
                const matrix = {};
                for (const row of rowsOf(result)) {
                    if (!matrix[row.role]) matrix[row.role] = {};
                    matrix[row.role][row.module_key] = !!row.allowed;
                }
                res.json(matrix);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getForUser(req, res) {
            try {
                const role = req.user.role;

                const [result] = await pool.query(
                    'CALL sp_get_permissions_for_role(?)',
                    [role]
                );

                const modules = rowsOf(result)
                    .filter(r => r.allowed)
                    .map(r => r.module_key);

                res.json({ role, modules });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async setForRole(req, res) {
            try {
                const { role } = req.params;
                const { modules } = req.body;

                const validRoles = ['Administrador', 'Barista', 'Cajero'];
                if (!validRoles.includes(role)) {
                    return res.status(400).json({ error: 'Rol inválido' });
                }

                if (!modules || typeof modules !== 'object') {
                    return res.status(400).json({ error: 'modules requerido (objeto {module_key: boolean})' });
                }

                for (const [moduleKey, allowed] of Object.entries(modules)) {
                    await pool.query(
                        'CALL sp_set_role_permission(?, ?, ?)',
                        [role, moduleKey, allowed ? 1 : 0]
                    );
                }

                clearPermissionsCache();
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}