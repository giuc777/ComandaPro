export class AuthService {
    constructor(pool, tokenService) {
        this.pool = pool;
        this.tokenService = tokenService;
    }

    async _getPermissionsForRole(role) {
        if (role === 'Administrador') {
            return ['dashboard','pos','kds','caja','productos','inventario','proveedores','catalogos','reportes','ajustes'];
        }
        const [result] = await this.pool.query('CALL sp_get_permissions_for_role(?)', [role]);
        const rows = Array.isArray(result[0]) ? result[0] : result;
        return rows.filter(r => r.allowed).map(r => r.module_key);
    }

    async _getGlobalSucursal() {
        const [result] = await this.pool.query("CALL sp_get_settings()");
        const rows = Array.isArray(result[0]) ? result[0] : result;
        const s = rows.find(r => r.setting_key === 'sucursal_nombre');
        return s ? s.setting_value : 'Roma Norte';
    }

    async _buildUserResponse(user) {
        const [permissions, sucursal] = await Promise.all([
            this._getPermissionsForRole(user.role),
            this._getGlobalSucursal()
        ]);
        return {
            id: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            sucursal,
            permissions
        };
    }

    async login(username, password, userAgent, ipAddress) {
        const [rows] = await this.pool.query(
            'CALL sp_get_user_by_username(?)',
            [username]
        );
        const user = rows[0];

        if (!user) {
            return { error: 'Credenciales incorrectas', status: 401 };
        }

        if (!user.active) {
            return { error: 'Cuenta desactivada', status: 403 };
        }

        if (user.locked_until && new Date(user.locked_until) > new Date()) {
            const minutes = Math.ceil(
                (new Date(user.locked_until) - new Date()) / 60000
            );
            return {
                error: `Cuenta bloqueada. Intenta de nuevo en ${minutes} minuto(s)`,
                status: 429
            };
        }

        const validPassword = await this.tokenService.comparePassword(
            password,
            user.password_hash
        );

        if (!validPassword) {
            await this.pool.query('CALL sp_record_failed_attempt(?)', [user.id]);
            return { error: 'Credenciales incorrectas', status: 401 };
        }

        await this.pool.query('CALL sp_reset_failed_attempts(?)', [user.id]);

        const accessToken = this.tokenService.generateAccessToken(user);
        const { rawToken, expiresAt } =
            await this.tokenService.createRefreshToken(
                user.id,
                userAgent,
                ipAddress
            );

        const userResponse = await this._buildUserResponse(user);

        return {
            user: userResponse,
            accessToken,
            refreshToken: rawToken,
            refreshTokenExpiresAt: expiresAt
        };
    }

    async refresh(refreshToken) {
        const data = await this.tokenService.validateRefreshToken(refreshToken);

        if (!data) {
            return { error: 'Token inválido o expirado', status: 401 };
        }

        await this.tokenService.revokeToken(refreshToken);

        const { rawToken, expiresAt } =
            await this.tokenService.createRefreshToken(
                data.user_id,
                null,
                null
            );

        await this.tokenService.revokeToken(refreshToken, this.tokenService.hashToken(rawToken));

        const accessToken = this.tokenService.generateAccessToken({
            id: data.user_id,
            username: data.username,
            name: data.name,
            role: data.role
        });

        const userResponse = await this._buildUserResponse({
            id: data.user_id,
            username: data.username,
            name: data.name,
            email: data.email,
            role: data.role,
            avatar: data.avatar
        });

        return {
            user: userResponse,
            accessToken,
            refreshToken: rawToken,
            refreshTokenExpiresAt: expiresAt
        };
    }

    async logout(refreshToken, accessToken) {
        if (refreshToken) {
            await this.tokenService.revokeToken(refreshToken);
        }

        if (accessToken) {
            try {
                const decoded = this.tokenService.verifyAccessToken(accessToken);
                await this.tokenService.addToBlacklist(
                    decoded.jti,
                    decoded.sub,
                    new Date(decoded.exp * 1000),
                    'logout'
                );
            } catch {
                // Token may already be expired, that's fine
            }
        }

        return { success: true };
    }

    async logoutAll(userId) {
        await this.tokenService.revokeAllUserTokens(userId);
        return { success: true };
    }

    async changePassword(userId, currentPassword, newPassword) {
        const [userRows] = await this.pool.query(
            'SELECT id, password_hash FROM users WHERE id = ?', [userId]
        );
        const user = Array.isArray(userRows) ? userRows[0] : userRows;

        if (!user) {
            return { error: 'Usuario no encontrado', status: 404 };
        }

        const valid = await this.tokenService.comparePassword(currentPassword, user.password_hash);
        if (!valid) {
            return { error: 'Contraseña actual incorrecta', status: 400 };
        }

        const hash = await this.tokenService.hashPassword(newPassword);
        await this.pool.query('CALL sp_change_password(?, ?)', [userId, hash]);
        return { success: true };
    }

    async getProfile(userId) {
        const [rows] = await this.pool.query(
            'CALL sp_get_user_by_id(?)',
            [userId]
        );
        const user = rows[0];

        if (!user) {
            return { error: 'Usuario no encontrado', status: 404 };
        }

        return this._buildUserResponse(user);
    }
}
