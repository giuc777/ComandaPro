import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

/**
 * @swagger
 * /api/reports/dashboard:
 *   get:
 *     summary: Resumen del dashboard (ventas del dia, ordenes activas, stock bajo)
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Resumen del dashboard
 */
/**
 * @swagger
 * /api/reports/daily:
 *   get:
 *     summary: Reporte diario completo (KPIs, ventas por hora, ranking, categorias)
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Reporte del dia
 */
/**
 * @swagger
 * /api/reports/products/ranking:
 *   get:
 *     summary: Ranking de productos mas vendidos
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: start
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: end
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de productos
 */
/**
 * @swagger
 * /api/reports/hourly:
 *   get:
 *     summary: Ventas agrupadas por hora
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Ventas por hora
 */
/**
 * @swagger
 * /api/reports/categories:
 *   get:
 *     summary: Ventas por categoria
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Ventas por categoria
 */
/**
 * @swagger
 * /api/reports/trend:
 *   get:
 *     summary: Tendencia de ventas por dia
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Tendencia de ventas
 */
/**
 * @swagger
 * /api/reports/period:
 *   get:
 *     summary: Comparativa de periodos (hoy vs ayer / semana vs semana)
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Comparativa de periodos
 */
/**
 * @swagger
 * /api/reports/cash-closing:
 *   get:
 *     summary: Reporte de cierre de caja por turno
 *     tags: [Reportes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: shiftId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Cierre de caja
 */
export function createReportRouter(reportController, tokenService) {
    const router = Router();

    // El acceso está gobernado por el módulo "reportes" (requireModule en index.js).
    const auth = [authenticate(tokenService)];

    router.get('/daily',
        ...auth,
        (req, res) => reportController.getDailyReport(req, res)
    );

    router.get('/products/ranking',
        ...auth,
        (req, res) => reportController.getProductRanking(req, res)
    );

    router.get('/hourly',
        ...auth,
        (req, res) => reportController.getHourlySales(req, res)
    );

    router.get('/categories',
        ...auth,
        (req, res) => reportController.getCategorySales(req, res)
    );

    router.get('/trend',
        ...auth,
        (req, res) => reportController.getSalesTrend(req, res)
    );

    router.get('/period',
        ...auth,
        (req, res) => reportController.getPeriodComparison(req, res)
    );

    router.get('/cash-closing',
        ...auth,
        (req, res) => reportController.getCashClosing(req, res)
    );

    return router;
}
