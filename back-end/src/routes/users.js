import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createUserRouter(userController, tokenService) {
    const router = Router();

    /**
     * @swagger
     * /api/users:
     *   get:
     *     tags: [Users]
     *     summary: Listar usuarios (admin)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de usuarios (incluye inactivos y bloqueados)
     *       403:
     *         description: Acceso denegado
     */
    router.get('/', authenticate(tokenService), adminOnly, (req, res) => userController.list(req, res));

    /**
     * @swagger
     * /api/users:
     *   post:
     *     tags: [Users]
     *     summary: Crear usuario (admin)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [username, password, name]
     *             properties:
     *               username: { type: string }
     *               password: { type: string }
     *               name: { type: string }
     *               email: { type: string }
     *               role: { type: string, enum: [Administrador, Barista, Cajero] }
     */
    router.post('/', authenticate(tokenService), adminOnly, (req, res) => userController.create(req, res));

    /**
     * @swagger
     * /api/users/{id}:
     *   put:
     *     tags: [Users]
     *     summary: Actualizar usuario (admin)
     *     security:
     *       - bearerAuth: []
     */
    router.put('/:id', authenticate(tokenService), adminOnly, (req, res) => userController.update(req, res));

    /**
     * @swagger
     * /api/users/{id}/password:
     *   put:
     *     tags: [Users]
     *     summary: Cambiar contraseña de usuario (admin)
     *     security:
     *       - bearerAuth: []
     */
    router.put('/:id/password', authenticate(tokenService), adminOnly, (req, res) => userController.setPassword(req, res));

    /**
     * @swagger
     * /api/users/{id}/unlock:
     *   put:
     *     tags: [Users]
     *     summary: Desbloquear usuario (admin)
     *     security:
     *       - bearerAuth: []
     */
    router.put('/:id/unlock', authenticate(tokenService), adminOnly, (req, res) => userController.unlock(req, res));

    /**
     * @swagger
     * /api/users/{id}:
     *   delete:
     *     tags: [Users]
     *     summary: Desactivar usuario (admin)
     *     security:
     *       - bearerAuth: []
     */
    router.delete('/:id', authenticate(tokenService), adminOnly, (req, res) => userController.delete(req, res));

    return router;
}
