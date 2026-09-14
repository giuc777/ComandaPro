import { Router } from 'express';
import { authenticate, adminOnly } from '../middleware/auth.js';

export function createUserRouter(userController, tokenService) {
    const router = Router();

    /**
     * @swagger
     * /api/users:
     *   get:
     *     tags: [Users]
     *     summary: Listar usuarios
     *     description: Retorna todos los usuarios activos (solo administradores)
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de usuarios
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/User'
     *       401:
     *         description: No autenticado
     *       403:
     *         description: Acceso denegado (solo administradores)
     */
    router.get('/', authenticate(tokenService), adminOnly, (req, res) => userController.list(req, res));

    /**
     * @swagger
     * /api/users:
     *   post:
     *     tags: [Users]
     *     summary: Crear usuario
     *     description: Crea un nuevo usuario en el sistema (solo administradores)
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateUserRequest'
     *     responses:
     *       201:
     *         description: Usuario creado exitosamente
     *       400:
     *         description: Datos inválidos
     *       401:
     *         description: No autenticado
     *       403:
     *         description: Acceso denegado (solo administradores)
     *       409:
     *         description: El username ya existe
     */
    router.post('/', authenticate(tokenService), adminOnly, (req, res) => userController.create(req, res));

    /**
     * @swagger
     * /api/users/{id}:
     *   put:
     *     tags: [Users]
     *     summary: Actualizar usuario
     *     description: Actualiza la información de un usuario (solo administradores)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID del usuario
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               email:
     *                 type: string
     *               role:
     *                 type: string
     *                 enum: [Administrador, Barista, Cajero]
     *               active:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Usuario actualizado
     *       401:
     *         description: No autenticado
     *       403:
     *         description: Acceso denegado (solo administradores)
     *       404:
     *         description: Usuario no encontrado
     */
    router.put('/:id', authenticate(tokenService), adminOnly, (req, res) => userController.update(req, res));

    /**
     * @swagger
     * /api/users/{id}:
     *   delete:
     *     tags: [Users]
     *     summary: Desactivar usuario
     *     description: Desactiva un usuario (borrado lógico, solo administradores)
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID del usuario
     *     responses:
     *       200:
     *         description: Usuario desactivado
     *       400:
     *         description: No puedes desactivarte a ti mismo
     *       401:
     *         description: No autenticado
     *       403:
     *         description: Acceso denegado (solo administradores)
     *       404:
     *         description: Usuario no encontrado
     */
    router.delete('/:id', authenticate(tokenService), adminOnly, (req, res) => userController.delete(req, res));

    return router;
}
