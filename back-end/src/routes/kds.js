import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createKdsRouter(kdsController, tokenService) {
    const router = Router();

    // Listado de la cocina (filas planas agrupadas por orden)
    router.get('/orders',
        authenticate(tokenService),
        (req, res) => kdsController.listOrders(req, res)
    );

    // Avanzar estado de una orden en la cocina
    router.patch('/orders/:id/status',
        authenticate(tokenService),
        (req, res) => kdsController.updateStatus(req, res)
    );

    return router;
}
