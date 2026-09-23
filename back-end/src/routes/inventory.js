import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createInventoryRouter(inventoryController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => inventoryController.listInventory(req, res)
    );

    router.get('/:id',
        authenticate(tokenService),
        (req, res) => inventoryController.getInventoryItem(req, res)
    );

    router.post('/',
        authenticate(tokenService),
        (req, res) => inventoryController.createInventoryItem(req, res)
    );

    router.put('/:id',
        authenticate(tokenService),
        (req, res) => inventoryController.updateInventoryItem(req, res)
    );

    router.patch('/:id/stock',
        authenticate(tokenService),
        (req, res) => inventoryController.updateStock(req, res)
    );

    router.delete('/:id',
        authenticate(tokenService),
        (req, res) => inventoryController.deleteInventoryItem(req, res)
    );

    return router;
}
