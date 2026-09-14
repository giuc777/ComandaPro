import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const WORK_FACTOR = parseInt(process.env.BCRYPT_WORK_FACTOR) || 12;

export class TokenService {
    constructor(pool) {
        this.pool = pool;
    }

    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    async hashPassword(password) {
        return bcrypt.hash(password, WORK_FACTOR);
    }

    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }

    generateAccessToken(user) {
        return jwt.sign(
            {
                sub: user.id,
                username: user.username,
                name: user.name,
                role: user.role,
                type: 'access'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
        );
    }

    generateRefreshToken() {
        return crypto.randomBytes(40).toString('hex');
    }

    async createRefreshToken(userId, userAgent, ipAddress) {
        const rawToken = this.generateRefreshToken();
        const tokenHash = this.hashToken(rawToken);
        const days = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

        await this.pool.query(
            'CALL sp_create_refresh_token(?, ?, ?, ?, ?)',
            [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null]
        );

        return { rawToken, expiresAt };
    }

    async validateRefreshToken(token) {
        const tokenHash = this.hashToken(token);
        const [rows] = await this.pool.query(
            'CALL sp_validate_refresh_token(?)',
            [tokenHash]
        );
        return rows[0] || null;
    }

    async revokeToken(token, replacedBy = null) {
        const tokenHash = this.hashToken(token);
        await this.pool.query(
            'CALL sp_revoke_refresh_token(?, ?)',
            [tokenHash, replacedBy || null]
        );
    }

    async revokeAllUserTokens(userId) {
        await this.pool.query('CALL sp_revoke_all_user_tokens(?)', [userId]);
    }

    async addToBlacklist(jti, userId, expiresAt, reason = 'logout') {
        await this.pool.query(
            'CALL sp_add_to_blacklist(?, ?, ?, ?)',
            [jti, userId, expiresAt, reason]
        );
    }

    async isJtiBlacklisted(jti) {
        const [rows] = await this.pool.query(
            'CALL sp_is_jti_blacklisted(?)',
            [jti]
        );
        return rows[0]?.is_blacklisted > 0;
    }
}
