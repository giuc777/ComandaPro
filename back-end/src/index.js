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
import { createAuthRouter } from './routes/auth.js';
import { createUserRouter } from './routes/users.js';
import { createCatalogRouter } from './routes/catalogs.js';
import { createProductRouter } from './routes/products.js';
import { createOrderRouter } from './routes/orders.js';
import { createTableRouter } from './routes/tables.js';
import { createPaymentRouter } from './routes/payments.js';

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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', createAuthRouter(authController, tokenService));
app.use('/api/users', createUserRouter(userController, tokenService));
app.use('/api/catalogs', createCatalogRouter(catalogController, tokenService));
app.use('/api/products', createProductRouter(productController, tokenService, catalogController));
app.use('/api/orders', createOrderRouter(orderController, tokenService));
app.use('/api/tables', createTableRouter(orderController, tokenService));
app.use('/api/payments', createPaymentRouter(paymentController, tokenService));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
});