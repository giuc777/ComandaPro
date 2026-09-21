import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createPaymentRouter(paymentController, tokenService) {
    const router = Router();

    // Resumen de ventas del dia
    router.get('/daily/summary',
        authenticate(tokenService),
        (req, res) => paymentController.getDailySalesSummary(req, res)
    );

    // Pagos del dia
    router.get('/daily',
        authenticate(tokenService),
        (req, res) => paymentController.getDailyPayments(req, res)
    );

    // Obtener pago por ID
    router.get('/:id',
        authenticate(tokenService),
        (req, res) => paymentController.getPaymentById(req, res)
    );

    // Registrar pago
    router.post('/',
        authenticate(tokenService),
        (req, res) => paymentController.recordPayment(req, res)
    );

    return router;
}
