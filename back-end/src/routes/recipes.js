import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createRecipeRouter(recipeController, tokenService) {
    const router = Router();

    router.get('/product/:id',
        authenticate(tokenService),
        (req, res) => recipeController.getProductRecipe(req, res)
    );

    router.get('/product/:id/cost',
        authenticate(tokenService),
        (req, res) => recipeController.getRecipeCost(req, res)
    );

    router.post('/product/:id',
        authenticate(tokenService),
        (req, res) => recipeController.upsertRecipeItem(req, res)
    );

    router.delete('/:recipeId',
        authenticate(tokenService),
        (req, res) => recipeController.deleteRecipeItem(req, res)
    );

    return router;
}
