import jwt from 'jsonwebtoken';

export function authenticate(tokenService) {
    return async (req, res, next) => {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token requerido' });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            if (decoded.type !== 'access') {
                return res.status(401).json({ error: 'Token inválido' });
            }

            if (decoded.jti && await tokenService.isJtiBlacklisted(decoded.jti)) {
                return res.status(401).json({ error: 'Token revocado' });
            }

            req.user = {
                id: decoded.sub,
                username: decoded.username,
                name: decoded.name,
                role: decoded.role,
                jti: decoded.jti
            };

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
            }
            return res.status(401).json({ error: 'Token inválido' });
        }
    };
}

export function adminOnly(req, res, next) {
    if (req.user?.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
}
