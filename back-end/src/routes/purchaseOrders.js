import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createPurchaseOrderRouter(poController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => poController.listPurchaseOrders(req, res)
    );

    router.get('/:id',
        authenticate(tokenService),
        (req, res) => poController.getPurchaseOrder(req, res)
    );

    router.post('/',
        authenticate(tokenService),
        (req, res) => poController.createPurchaseOrder(req, res)
    );

    router.post('/:id/items',
        authenticate(tokenService),
        (req, res) => poController.addPoItem(req, res)
    );

    router.delete('/:id/items/:itemId',
        authenticate(tokenService),
        (req, res) => poController.deletePoItem(req, res)
    );

    router.put('/:id/receive',
        authenticate(tokenService),
        (req, res) => poController.receivePurchaseOrder(req, res)
    );

    router.put('/:id/cancel',
        authenticate(tokenService),
        (req, res) => poController.cancelPurchaseOrder(req, res)
    );

    return router;
}
