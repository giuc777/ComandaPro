import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createPermissionsRouter(permissionsController) {
    const router = Router();

    router.get('/', authenticate(), adminOnly, (req, res) => permissionsController.getAll(req, res));
    router.get('/me', authenticate(), (req, res) => permissionsController.getForUser(req, res));
    router.put('/:role', authenticate(), adminOnly, (req, res) => permissionsController.setForRole(req, res));

    return router;
}
