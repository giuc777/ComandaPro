import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createSettingsRouter(settingsController) {
    const router = Router();

    router.get('/', authenticate(), (req, res) => settingsController.get(req, res));
    router.put('/', authenticate(), adminOnly, (req, res) => settingsController.update(req, res));

    return router;
}
