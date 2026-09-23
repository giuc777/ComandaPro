function rowsOf(result) {
    if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
        return result[0];
    }
    return result || [];
}

export function createSettingsController(pool) {
    return {
        async get(req, res) {
            try {
                const [result] = await pool.query('CALL sp_get_settings()');
                const settings = {};
                for (const row of rowsOf(result)) {
                    settings[row.setting_key] = row.setting_value;
                }
                res.json(settings);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async update(req, res) {
            try {
                const { key, value } = req.body;

                if (!key || value === undefined) {
                    return res.status(400).json({ error: 'key y value requeridos' });
                }

                await pool.query('CALL sp_update_setting(?, ?)', [key, String(value)]);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}