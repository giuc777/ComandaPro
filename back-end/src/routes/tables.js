import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createTableRouter(orderController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => orderController.listTables(req, res)
    );

    return router;
}
