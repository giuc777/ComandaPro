import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createAdminOrdersRouter(adminOrdersController, tokenService) {
    const router = Router();

    // Listado de ordenes (filtros y limite)
    router.get('/',
        authenticate(tokenService),
        (req, res) => adminOrdersController.list(req, res)
    );

    // Detalle de una orden con items
    router.get('/:id',
        authenticate(tokenService),
        (req, res) => adminOrdersController.get(req, res)
    );

    return router;
}
