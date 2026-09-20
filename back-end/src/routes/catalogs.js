import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createCatalogRouter(catalogController, tokenService) {
    const router = Router();

    // ========================
    // GRUPOS DE CATALOGO
    // ========================

    router.get('/groups',
        authenticate(tokenService),
        (req, res) => catalogController.listGroups(req, res)
    );

    router.get('/groups/:id',
        authenticate(tokenService),
        (req, res) => catalogController.getGroup(req, res)
    );

    router.post('/groups',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.createGroup(req, res)
    );

    router.put('/groups/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.updateGroup(req, res)
    );

    router.delete('/groups/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.deleteGroup(req, res)
    );

    // ========================
    // ITEMS DE CATALOGO
    // ========================

    router.get('/groups/:slug/items',
        authenticate(tokenService),
        (req, res) => catalogController.listItemsByGroup(req, res)
    );

    router.get('/items/:id',
        authenticate(tokenService),
        (req, res) => catalogController.getItem(req, res)
    );

    router.post('/items',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.createItem(req, res)
    );

    router.put('/items/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.updateItem(req, res)
    );

    router.delete('/items/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => catalogController.deleteItem(req, res)
    );

    return router;
}
