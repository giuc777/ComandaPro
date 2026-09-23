import jwt from 'jsonwebtoken';

const permissionsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getRoleModules(pool, role) {
    if (role === 'Administrador') return null;

    const cached = permissionsCache.get(role);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.modules;

    const [result] = await pool.query('CALL sp_get_permissions_for_role(?)', [role]);
    const rows = Array.isArray(result[0]) ? result[0] : result;
    const modules = new Set(rows.filter(r => r.allowed).map(r => r.module_key));
    permissionsCache.set(role, { modules, ts: Date.now() });
    return modules;
}

export function clearPermissionsCache() {
    permissionsCache.clear();
}

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

export function requireModule(pool, moduleKey, { writeOnly = false } = {}) {
    return async (req, res, next) => {
        if (req.user?.role === 'Administrador') return next();

        if (writeOnly && req.method === 'GET') return next();

        try {
            const modules = await getRoleModules(pool, req.user.role);
            if (!modules || modules.has(moduleKey)) return next();

            return res.status(403).json({ error: 'Módulo no disponible para tu rol' });
        } catch (error) {
            return res.status(500).json({ error: 'Error verificando permisos' });
        }
    };
}
