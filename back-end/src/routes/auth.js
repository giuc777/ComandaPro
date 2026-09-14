import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createAuthRouter(authController, tokenService) {
    const router = Router();

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     tags: [Auth]
     *     summary: Iniciar sesión
     *     description: Autentica un usuario y retorna tokens de acceso
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login exitoso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       401:
     *         description: Credenciales incorrectas
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       429:
     *         description: Cuenta bloqueada por intentos fallidos
     */
    router.post('/login', (req, res) => authController.login(req, res));

    /**
     * @swagger
     * /api/auth/refresh:
     *   post:
     *     tags: [Auth]
     *     summary: Renovar token
     *     description: Genera un nuevo access token usando el refresh token
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RefreshRequest'
     *     responses:
     *       200:
     *         description: Token renovado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       401:
     *         description: Refresh token inválido o expirado
     */
    router.post('/refresh', (req, res) => authController.refresh(req, res));

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     tags: [Auth]
     *     summary: Cerrar sesión
     *     description: Revoca el refresh token y agrega el access token a la blacklist
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: Sesión cerrada exitosamente
     */
    router.post('/logout', (req, res) => authController.logout(req, res));

    /**
     * @swagger
     * /api/auth/logout-all:
     *   post:
     *     tags: [Auth]
     *     summary: Cerrar todas las sesiones
     *     description: Revoca todos los refresh tokens del usuario autenticado
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Todas las sesiones cerradas
     *       401:
     *         description: No autenticado
     */
    router.post('/logout-all', authenticate(tokenService), (req, res) => authController.logoutAll(req, res));

    /**
     * @swagger
     * /api/auth/profile:
     *   get:
     *     tags: [Auth]
     *     summary: Ver perfil
     *     description: Retorna la información del usuario autenticado
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Perfil del usuario
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       401:
     *         description: No autenticado
     */
    router.get('/profile', authenticate(tokenService), (req, res) => authController.getProfile(req, res));

    /**
     * @swagger
     * /api/auth/change-password:
     *   post:
     *     tags: [Auth]
     *     summary: Cambiar contraseña
     *     description: Permite al usuario cambiar su contraseña
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [currentPassword, newPassword]
     *             properties:
     *               currentPassword:
     *                 type: string
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Contraseña cambiada exitosamente
     *       400:
     *         description: Contraseña actual incorrecta o nueva contraseña inválida
     *       401:
     *         description: No autenticado
     */
    router.post('/change-password', authenticate(tokenService), (req, res) => authController.changePassword(req, res));

    return router;
}
