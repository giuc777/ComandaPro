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
                },
                CatalogGroup: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Categorias de Producto' },
                        slug: { type: 'string', example: 'categorias_producto' },
                        description: { type: 'string', example: 'Clasificacion de productos del menu' },
                        sort_order: { type: 'integer', example: 1 },
                        active: { type: 'boolean', example: true },
                        item_count: { type: 'integer', example: 5 },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                CatalogItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        group_id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Bebidas Calientes' },
                        description: { type: 'string', example: 'Cafes y bebidas calientes' },
                        icon: { type: 'string', example: 'local_cafe' },
                        color: { type: 'string', example: '#543310' },
                        parent_id: { type: 'integer', nullable: true, example: null },
                        sort_order: { type: 'integer', example: 1 },
                        active: { type: 'boolean', example: true },
                        parent_name: { type: 'string', nullable: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                CreateCatalogGroupRequest: {
                    type: 'object',
                    required: ['name', 'slug'],
                    properties: {
                        name: { type: 'string', example: 'Categorias de Producto' },
                        slug: { type: 'string', example: 'categorias_producto' },
                        description: { type: 'string', example: 'Clasificacion de productos del menu' },
                        sort_order: { type: 'integer', example: 1 }
                    }
                },
                CreateCatalogItemRequest: {
                    type: 'object',
                    required: ['group_id', 'name'],
                    properties: {
                        group_id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Bebidas Calientes' },
                        description: { type: 'string', example: 'Cafes y bebidas calientes' },
                        icon: { type: 'string', example: 'local_cafe' },
                        color: { type: 'string', example: '#543310' },
                        parent_id: { type: 'integer', example: null },
                        sort_order: { type: 'integer', example: 1 }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
