import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createOrderRouter(orderController, tokenService) {
    const router = Router();

    // ========================
    // ORDENES
    // ========================

    // Listar órdenes (por status, default: pausadas)
    router.get('/',
        authenticate(tokenService),
        (req, res) => orderController.listOrders(req, res)
    );

    // Crear orden (status: pausada)
    router.post('/',
        authenticate(tokenService),
        (req, res) => orderController.createOrder(req, res)
    );

    // Obtener orden con ítems
    router.get('/:id',
        authenticate(tokenService),
        (req, res) => orderController.getOrder(req, res)
    );

    // Actualizar orden (retomar/editar, replace items)
    // Permisos: Administrador siempre; demas roles con pos solo en estado pausada
    // (se validan en el controller, ver orderLockError)
    router.put('/:id',
        authenticate(tokenService),
        (req, res) => orderController.updateOrder(req, res)
    );

    // Enviar orden a cocina (pausada -> enviada)
    router.post('/:id/send',
        authenticate(tokenService),
        (req, res) => orderController.sendToKitchen(req, res)
    );

    // Anular orden
    router.delete('/:id',
        authenticate(tokenService),
        adminOnly,
        (req, res) => orderController.voidOrder(req, res)
    );

    // ========================
    // ITEMS DE ORDEN
    // ========================

    router.post('/:id/items',
        authenticate(tokenService),
        (req, res) => orderController.addOrderItem(req, res)
    );

    // Se valida en el controller: Administrador siempre, demas roles solo en pausada
    router.delete('/:id/items/:itemId',
        authenticate(tokenService),
        (req, res) => orderController.deleteOrderItem(req, res)
    );

    return router;
}
