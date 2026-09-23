import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createSupplierRouter(supplierController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => supplierController.listSuppliers(req, res)
    );

    router.get('/:id',
        authenticate(tokenService),
        (req, res) => supplierController.getSupplierDetail(req, res)
    );

    router.post('/',
        authenticate(tokenService),
        (req, res) => supplierController.createSupplier(req, res)
    );

    router.put('/:id',
        authenticate(tokenService),
        (req, res) => supplierController.updateSupplier(req, res)
    );

    return router;
}
