import { Router } from 'express';
import { authenticate, requireModule } from '../middleware/auth.js';

export function createOrderRouter(orderController, tokenService, pool) {
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

    // Actualizar orden (cabecera siempre; replace items solo en pausada)
    // Se valida en el controller (orderController.updateOrder)
    router.put('/:id',
        authenticate(tokenService),
        (req, res) => orderController.updateOrder(req, res)
    );

    // Enviar a cocina: pausada/enviada/preparando/lista/completada
    // (solo marca los items con sent = 0)
    router.post('/:id/send',
        authenticate(tokenService),
        (req, res) => orderController.sendToKitchen(req, res)
    );

    // Anular orden
    // Permisos: Administrador o rol con modulo pos (se anula desde el POS/Caja/KDS;
    // la pantalla /kds conserva su propio guard con modulo kds)
    router.delete('/:id',
        authenticate(tokenService),
        requireModule(pool, 'pos'),
        (req, res) => orderController.voidOrder(req, res)
    );

    // ========================
    // ITEMS DE ORDEN
    // ========================

    router.post('/:id/items',
        authenticate(tokenService),
        (req, res) => orderController.addOrderItem(req, res)
    );

    // Se valida en el controller: item solo si sent = 0 y orden no pagada/anulada
    router.delete('/:id/items/:itemId',
        authenticate(tokenService),
        (req, res) => orderController.deleteOrderItem(req, res)
    );

    return router;
}
