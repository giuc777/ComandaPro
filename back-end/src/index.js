import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/database.js';
import swaggerSpec from './config/swagger.js';
import { TokenService } from './services/tokenService.js';
import { AuthService } from './services/authService.js';
import { createAuthController } from './controllers/authController.js';
import { createUserController } from './controllers/userController.js';
import { createCatalogController } from './controllers/catalogController.js';
import { createProductController } from './controllers/productController.js';
import { createOrderController } from './controllers/orderController.js';
import { createPaymentController } from './controllers/paymentController.js';
import { createShiftController } from './controllers/shiftController.js';
import { createPrintController } from './controllers/printController.js';
import { createInventoryController } from './controllers/inventoryController.js';
import { createRecipeController } from './controllers/recipeController.js';
import { createSupplierController } from './controllers/supplierController.js';
import { createPurchaseOrderController } from './controllers/purchaseOrderController.js';
import { createReportController } from './controllers/reportController.js';
import { createSettingsController } from './controllers/settingsController.js';
import { createPermissionsController } from './controllers/permissionsController.js';
import { authenticate, adminOnly, requireModule } from './middleware/auth.js';
import { createAuthRouter } from './routes/auth.js';
import { createUserRouter } from './routes/users.js';
import { createCatalogRouter } from './routes/catalogs.js';
import { createProductRouter } from './routes/products.js';
import { createOrderRouter } from './routes/orders.js';
import { createTableRouter } from './routes/tables.js';
import { createPaymentRouter } from './routes/payments.js';
import { createShiftRouter } from './routes/shifts.js';
import { createPrintRouter } from './routes/print.js';
import { createInventoryRouter } from './routes/inventory.js';
import { createRecipeRouter } from './routes/recipes.js';
import { createSupplierRouter } from './routes/suppliers.js';
import { createPurchaseOrderRouter } from './routes/purchaseOrders.js';
import { createReportRouter } from './routes/reports.js';
import { createSettingsRouter } from './routes/settings.js';
import { createPermissionsRouter } from './routes/permissions.js';
import { createPrinterService } from './services/printerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = config.port;

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'ComandaPro API Documentation'
}));

app.get('/api-docs.json', (req, res) => {
    res.json(swaggerSpec);
});

const tokenService = new TokenService(config.pool);
const authService = new AuthService(config.pool, tokenService);
const authController = createAuthController(authService);
const userController = createUserController(config.pool, tokenService);
const catalogController = createCatalogController(config.pool);
const productController = createProductController(config.pool);
const orderController = createOrderController(config.pool);
const paymentController = createPaymentController(config.pool);
const shiftController = createShiftController(config.pool);
const printerService = createPrinterService(config.pool);
const printController = createPrintController(printerService);
const inventoryController = createInventoryController(config.pool);
const recipeController = createRecipeController(config.pool);
const supplierController = createSupplierController(config.pool);
const purchaseOrderController = createPurchaseOrderController(config.pool);
const reportController = createReportController(config.pool);
const settingsController = createSettingsController(config.pool);
const permissionsController = createPermissionsController(config.pool);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', createAuthRouter(authController, tokenService));
app.use('/api/users', createUserRouter(userController, tokenService));
app.use('/api/catalogs', authenticate(tokenService), requireModule(config.pool, 'catalogos', { writeOnly: true }));
app.use('/api/catalogs', createCatalogRouter(catalogController, tokenService));
app.use('/api/products', authenticate(tokenService), requireModule(config.pool, 'productos', { writeOnly: true }));
app.use('/api/products', createProductRouter(productController, tokenService, catalogController));
app.use('/api/orders', authenticate(tokenService), requireModule(config.pool, 'pos', { writeOnly: true }));
app.use('/api/orders', createOrderRouter(orderController, tokenService));
app.use('/api/tables', authenticate(tokenService), requireModule(config.pool, 'pos', { writeOnly: true }));
app.use('/api/tables', createTableRouter(orderController, tokenService));
app.use('/api/payments', createPaymentRouter(paymentController, tokenService));
app.use('/api/shifts', authenticate(tokenService), requireModule(config.pool, 'caja', { writeOnly: true }));
app.use('/api/shifts', createShiftRouter(shiftController, tokenService));
app.use('/api/print', createPrintRouter(printController, tokenService));
app.use('/api/inventory', authenticate(tokenService), requireModule(config.pool, 'inventario', { writeOnly: true }));
app.use('/api/inventory', createInventoryRouter(inventoryController, tokenService));
app.use('/api/recipes', authenticate(tokenService), requireModule(config.pool, 'inventario', { writeOnly: true }));
app.use('/api/recipes', createRecipeRouter(recipeController, tokenService));
app.use('/api/suppliers', authenticate(tokenService), requireModule(config.pool, 'proveedores', { writeOnly: true }));
app.use('/api/suppliers', createSupplierRouter(supplierController, tokenService));
app.use('/api/purchase-orders', authenticate(tokenService), requireModule(config.pool, 'proveedores', { writeOnly: true }));
app.use('/api/purchase-orders', createPurchaseOrderRouter(purchaseOrderController, tokenService));
app.use('/api/reports/dashboard', (req, res, next) => authenticate(tokenService)(req, res, next));
app.use('/api/reports/dashboard', (req, res) => reportController.getDashboard(req, res));
app.use('/api/reports', authenticate(tokenService), requireModule(config.pool, 'reportes'));
app.use('/api/reports', createReportRouter(reportController, tokenService));
app.use('/api/settings', createSettingsRouter(settingsController));
app.use('/api/permissions', createPermissionsRouter(permissionsController));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});