import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'ComandaPro API',
            version: '1.0.0',
            description: 'API para el sistema de punto de venta de cafetería especializada',
            contact: {
                name: 'ComandaPro',
                email: 'admin@comandapro.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT Access Token'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        username: { type: 'string', example: 'admin' },
                        name: { type: 'string', example: 'Administrador' },
                        email: { type: 'string', example: 'admin@comandapro.com' },
                        role: { type: 'string', enum: ['Administrador', 'Barista', 'Cajero'], example: 'Administrador' },
                        avatar: { type: 'string', example: 'A' },
                        sucursal: { type: 'string', example: 'Roma Norte' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['username', 'password'],
                    properties: {
                        username: { type: 'string', example: 'admin' },
                        password: { type: 'string', example: 'admin123' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        user: { $ref: '#/components/schemas/User' },
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        refreshTokenExpiresAt: { type: 'string', format: 'date-time' }
                    }
                },
                RefreshRequest: {
                    type: 'object',
                    required: ['refreshToken'],
                    properties: {
                        refreshToken: { type: 'string' }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Credenciales incorrectas' }
                    }
                },
                CreateUserRequest: {
                    type: 'object',
                    required: ['username', 'password', 'name'],
                    properties: {
                        username: { type: 'string', example: 'nuevo_usuario' },
                        password: { type: 'string', minLength: 8, example: 'password123' },
                        name: { type: 'string', example: 'Nuevo Usuario' },
                        email: { type: 'string', example: 'nuevo@comandapro.com' },
                        role: { type: 'string', enum: ['Administrador', 'Barista', 'Cajero'], example: 'Barista' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
