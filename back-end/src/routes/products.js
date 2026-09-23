import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { uploadProductImage } from '../middleware/upload.js';

export function createProductRouter(productController, tokenService, catalogController) {
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
        uploadProductImage,
        (req, res) => productController.createProduct(req, res)
    );

    router.put('/:id',
        authenticate(tokenService),
        uploadProductImage,
        (req, res) => productController.updateProduct(req, res)
    );

    router.delete('/:id',
        authenticate(tokenService),
        (req, res) => productController.deleteProduct(req, res)
    );

    // ========================
    // MODIFICADORES POR PRODUCTO
    // ========================

    if (catalogController) {
        router.get('/:id/modifiers',
            authenticate(tokenService),
            (req, res) => catalogController.getProductModifiers(req, res)
        );

        router.put('/:id/modifiers',
            authenticate(tokenService),
            (req, res) => catalogController.assignProductModifiers(req, res)
        );
    }

    return router;
}
