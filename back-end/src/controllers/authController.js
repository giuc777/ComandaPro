export function createAuthController(authService) {
    return {
        async login(req, res) {
            try {
                const { username, password } = req.body;

                if (!username || !password) {
                    return res.status(400).json({ error: 'Username y password requeridos' });
                }

                const result = await authService.login(
                    username,
                    password,
                    req.headers['user-agent'],
                    req.ip
                );

                if (result.error) {
                    return res.status(result.status).json({ error: result.error });
                }

                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async refresh(req, res) {
            try {
                const { refreshToken } = req.body;

                if (!refreshToken) {
                    return res.status(400).json({ error: 'Refresh token requerido' });
                }

                const result = await authService.refresh(refreshToken);

                if (result.error) {
                    return res.status(result.status).json({ error: result.error });
                }

                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async logout(req, res) {
            try {
                const { refreshToken } = req.body;
                const accessToken = req.headers.authorization?.split(' ')[1];

                await authService.logout(refreshToken, accessToken);

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async logoutAll(req, res) {
            try {
                await authService.logoutAll(req.user.id);
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async getProfile(req, res) {
            try {
                const result = await authService.getProfile(req.user.id);

                if (result.error) {
                    return res.status(result.status).json({ error: result.error });
                }

                res.json(result);
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        },

        async changePassword(req, res) {
            try {
                const { currentPassword, newPassword } = req.body;

                if (!currentPassword || !newPassword) {
                    return res.status(400).json({ error: 'Contraseña actual y nueva requeridas' });
                }

                if (newPassword.length < 8) {
                    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
                }

                const result = await authService.changePassword(
                    req.user.id,
                    currentPassword,
                    newPassword
                );

                if (result.error) {
                    return res.status(result.status).json({ error: result.error });
                }

                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ error: 'Error del servidor' });
            }
        }
    };
}
