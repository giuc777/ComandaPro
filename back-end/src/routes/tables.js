import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createTableRouter(orderController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => orderController.listTables(req, res)
    );

    // Cambio manual de estado (libre <-> ocupada). El middleware del modulo pos
    // (writeOnly) ya exige el modulo pos para los metodos que no son GET.
    router.put('/:id/status',
        authenticate(tokenService),
        (req, res) => orderController.updateTableStatus(req, res)
    );

    return router;
}
