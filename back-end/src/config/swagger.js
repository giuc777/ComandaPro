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
                        is_modifier: { type: 'boolean', example: false },
                        required: { type: 'boolean', example: false },
                        max_selections: { type: 'integer', example: 1 },
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
                        price_adjustment: { type: 'number', format: 'float', example: 0 },
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
                        sort_order: { type: 'integer', example: 1 },
                        is_modifier: { type: 'boolean', example: false },
                        required: { type: 'boolean', example: false },
                        max_selections: { type: 'integer', example: 1 }
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
                        sort_order: { type: 'integer', example: 1 },
                        price_adjustment: { type: 'number', format: 'float', example: 0 }
                    }
                },
                Product: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Latte Vainilla' },
                        category_id: { type: 'integer', nullable: true, example: 1 },
                        category_name: { type: 'string', nullable: true, example: 'Bebidas Calientes' },
                        price: { type: 'number', format: 'float', example: 28.00 },
                        cost: { type: 'number', format: 'float', example: 8.50 },
                        description: { type: 'string', example: 'Suave y aromatico' },
                        badge: { type: 'string', nullable: true, example: 'Popular' },
                        image: { type: 'string', nullable: true, example: 'abc-123.jpg' },
                        sort_order: { type: 'integer', example: 1 },
                        active: { type: 'boolean', example: true },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                CreateProductRequest: {
                    type: 'object',
                    required: ['name', 'price'],
                    properties: {
                        name: { type: 'string', example: 'Latte Vainilla' },
                        category_id: { type: 'integer', example: 1 },
                        price: { type: 'number', format: 'float', example: 28.00 },
                        cost: { type: 'number', format: 'float', example: 8.50 },
                        description: { type: 'string', example: 'Suave y aromatico' },
                        badge: { type: 'string', example: 'Popular' },
                        sort_order: { type: 'integer', example: 1 }
                    }
                },
                AssignProductModifiersRequest: {
                    type: 'object',
                    required: ['group_ids'],
                    properties: {
                        group_ids: {
                            type: 'array',
                            items: { type: 'integer' },
                            example: [1, 2, 3]
                        }
                    }
                },
                ProductModifierAssignment: {
                    type: 'object',
                    properties: {
                        group_id: { type: 'integer', example: 1 },
                        group_name: { type: 'string', example: 'Tipo de Leche' },
                        required: { type: 'boolean', example: false },
                        max_selections: { type: 'integer', example: 1 },
                        option_id: { type: 'integer', example: 1 },
                        option_name: { type: 'string', example: 'Entera' },
                        price_adjustment: { type: 'number', format: 'float', example: 0 }
                    }
                },

                // ========================
                // ORDERS (FASE 04)
                // ========================

                Order: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1049 },
                        status: { type: 'string', enum: ['pausada','pagada','anulada','enviada','preparando','lista','completada'], example: 'pausada' },
                        table_id: { type: 'integer', nullable: true, example: 4 },
                        table_name: { type: 'string', nullable: true, example: 'Terraza A' },
                        customer_name: { type: 'string', nullable: true, example: 'Ana G.' },
                        mode: { type: 'string', enum: ['mesa','llevar'], example: 'mesa' },
                        notes: { type: 'string', nullable: true },
                        subtotal: { type: 'number', format: 'float', example: 72.00 },
                        tax: { type: 'number', format: 'float', example: 8.64 },
                        total: { type: 'number', format: 'float', example: 80.64 },
                        created_by: { type: 'integer', nullable: true, example: 1 },
                        created_by_name: { type: 'string', nullable: true, example: 'Mateo Rodriguez' },
                        parked_at: { type: 'string', format: 'date-time', nullable: true },
                        voided_at: { type: 'string', format: 'date-time', nullable: true },
                        minutes_parked: { type: 'integer', example: 5 },
                        item_count: { type: 'integer', example: 3 },
                        total_units: { type: 'integer', example: 4 },
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/OrderItem' }
                        }
                    }
                },
                OrderItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        product_id: { type: 'integer', example: 5 },
                        product_name: { type: 'string', example: 'Latte Vainilla' },
                        product_image: { type: 'string', nullable: true, example: 'latte.jpg' },
                        quantity: { type: 'integer', example: 1 },
                        unit_price: { type: 'number', format: 'float', example: 32.00 },
                        modifiers: { type: 'string', nullable: true, example: '[12,38]' },
                        modifier_labels: { type: 'string', nullable: true, example: 'Avena, Grande' },
                        notes: { type: 'string', nullable: true },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                CreateOrderRequest: {
                    type: 'object',
                    properties: {
                        table_id: { type: 'integer', nullable: true, example: 4 },
                        customer_name: { type: 'string', nullable: true, example: 'Ana G.' },
                        mode: { type: 'string', enum: ['mesa','llevar'], example: 'mesa' },
                        notes: { type: 'string', nullable: true },
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    product_id: { type: 'integer', example: 5 },
                                    quantity: { type: 'integer', example: 1 },
                                    unit_price: { type: 'number', format: 'float', example: 32.00 },
                                    modifiers: { type: 'string', nullable: true, example: '[12,38]' },
                                    modifier_labels: { type: 'string', nullable: true, example: 'Avena, Grande' },
                                    notes: { type: 'string', nullable: true }
                                }
                            }
                        }
                    }
                },
                Table: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Mesa 1' },
                        capacity: { type: 'integer', example: 4 },
                        status: { type: 'string', enum: ['free','occupied','dirty'], example: 'free' },
                        current_order_id: { type: 'integer', nullable: true }
                    }
                },

                // ========================
                // ERROR
                // ========================
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Error del servidor' }
                    }
                }
            }
        }
    },
    apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
