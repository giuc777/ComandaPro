import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';
import { uploadProductImage } from '../middleware/upload.js';

export function createProductRouter(productController, tokenService) {
    const router = Router();

    router.get('/',
        authenticate(tokenService),
        (req, res) => productController.listProducts(req, res)
    );

    router.get('/:id',
        authenticate(tokenService),
        (req, res) => productController.getProduct(req, res)
    );

    router.post('/',
        authenticate(tokenService),
        adminOnly,
        uploadProductImage,
        (req, res) => productController.createProduct(req, res)
    );

    router.put('/:id',
        authenticate(tokenService),
        adminOnly,
        uploadProductImage,
        (req, res) => productController.updateProduct(req, res)
    );

    router.delete('/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => productController.deleteProduct(req, res)
    );

    return router;
}
