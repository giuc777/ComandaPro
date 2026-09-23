import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

/**
 * @swagger
 * /api/print/receipt/{id}:
 *   post:
 *     summary: Imprimir recibo de un pago
 *     tags: [Impresion]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID del pago
 *     responses:
 *       200:
 *         description: Recibo enviado a impresora
 *       501:
 *         description: Impresora deshabilitada
 */
/**
 * @swagger
 * /api/print/test:
 *   post:
 *     summary: Imprimir hoja de prueba
 *     tags: [Impresion]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Prueba enviada a impresora
 *       501:
 *         description: Impresora deshabilitada
 */
/**
 * @swagger
 * /api/print/status:
 *   get:
 *     summary: Estado de la impresora
 *     tags: [Impresion]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Configuracion y estado
 */
export function createPrintRouter(printController, tokenService) {
    const router = Router();

    router.post('/receipt/:id',
        authenticate(tokenService),
        (req, res) => printController.printReceipt(req, res)
    );

    router.post('/test',
        authenticate(tokenService),
        (req, res) => printController.printTest(req, res)
    );

    router.get('/status',
        authenticate(tokenService),
        (req, res) => printController.getStatus(req, res)
    );

    return router;
}
