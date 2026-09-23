import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

/**
 * @swagger
 * /api/shifts/current:
 *   get:
 *     summary: Obtener turno abierto actual
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Turno actual o null
 */
/**
 * @swagger
 * /api/shifts/history:
 *   get:
 *     summary: Historial de turnos cerrados
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Lista de turnos
 */
/**
 * @swagger
 * /api/shifts/open:
 *   post:
 *     summary: Abrir un nuevo turno
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OpenShiftRequest' }
 *     responses:
 *       201:
 *         description: Turno creado
 *       409:
 *         description: Ya hay turno abierto en la estacion
 */
/**
 * @swagger
 * /api/shifts/{id}/close:
 *   post:
 *     summary: Cerrar turno con arqueo
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/CloseShiftRequest' }
 *     responses:
 *       200:
 *         description: Turno cerrado con resumen
 */
/**
 * @swagger
 * /api/shifts/{id}/arqueo:
 *   get:
 *     summary: Desglose de ventas para arqueo
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Totales por metodo de pago
 */
/**
 * @swagger
 * /api/shifts/{id}/transactions:
 *   post:
 *     summary: Registrar transaccion en turno
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, method, amount]
 *             properties:
 *               order_id: { type: integer, nullable: true }
 *               type: { type: string, enum: [sale, refund, void] }
 *               method: { type: string, enum: [efectivo, tarjeta, qr] }
 *               amount: { type: number, format: float }
 *     responses:
 *       201:
 *         description: Transaccion registrada
 */
/**
 * @swagger
 * /api/shifts/{id}/transactions:
 *   get:
 *     summary: Listar transacciones de un turno
 *     tags: [Turnos]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Lista de movimientos del turno
 */
export function createShiftRouter(shiftController, tokenService) {
    const router = Router();

    router.get('/current',
        authenticate(tokenService),
        (req, res) => shiftController.getCurrentShift(req, res)
    );

    router.get('/history',
        authenticate(tokenService),
        (req, res) => shiftController.getShiftHistory(req, res)
    );

    router.post('/open',
        authenticate(tokenService),
        (req, res) => shiftController.openShift(req, res)
    );

    router.post('/:id/close',
        authenticate(tokenService),
        (req, res) => shiftController.closeShift(req, res)
    );

    router.get('/:id/arqueo',
        authenticate(tokenService),
        (req, res) => shiftController.getArqueo(req, res)
    );

    router.get('/:id/transactions',
        authenticate(tokenService),
        (req, res) => shiftController.getShiftTransactions(req, res)
    );

    router.post('/:id/transactions',
        authenticate(tokenService),
        (req, res) => shiftController.recordShiftTransaction(req, res)
    );

    return router;
}
