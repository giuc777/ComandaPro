import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createModifierRouter(modifierController, tokenService) {
    const router = Router();

    // ========================
    // GRUPOS
    // ========================

    router.get('/groups',
        authenticate(tokenService),
        (req, res) => modifierController.listGroups(req, res)
    );

    router.get('/groups/:id',
        authenticate(tokenService),
        (req, res) => modifierController.getGroup(req, res)
    );

    router.post('/groups',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.createGroup(req, res)
    );

    router.put('/groups/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.updateGroup(req, res)
    );

    router.delete('/groups/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.deleteGroup(req, res)
    );

    // ========================
    // OPCIONES
    // ========================

    router.get('/groups/:id/options',
        authenticate(tokenService),
        (req, res) => modifierController.listOptions(req, res)
    );

    router.post('/options',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.createOption(req, res)
    );

    router.put('/options/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.updateOption(req, res)
    );

    router.delete('/options/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => modifierController.deleteOption(req, res)
    );

    return router;
}