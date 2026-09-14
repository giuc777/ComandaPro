# Fase 2: Productos y Categorías

## Objetivo
Implementar el catálogo de productos con sus categorías, proporcionando la base para el terminal POS.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 2: Categorías y Productos
-- ============================================

CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    badge VARCHAR(50),
    image VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active ON products(active);
```

---

## 2. Procedimientos Almacenados

```sql
-- Listar categorías activas
DELIMITER //
CREATE PROCEDURE sp_list_categories()
BEGIN
    SELECT id, name, icon, display_order
    FROM categories
    WHERE active = TRUE
    ORDER BY display_order;
END //
DELIMITER ;

-- Listar productos (filtro por categoría opcional)
DELIMITER //
CREATE PROCEDURE sp_list_products(IN p_category_id INT)
BEGIN
    IF p_category_id IS NULL THEN
        SELECT p.id, p.name, p.category_id, c.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.active = TRUE
        ORDER BY c.display_order, p.name;
    ELSE
        SELECT p.id, p.name, p.category_id, c.name AS category_name,
               p.price, p.cost, p.description, p.badge, p.image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        WHERE p.category_id = p_category_id AND p.active = TRUE
        ORDER BY p.name;
    END IF;
END //
DELIMITER ;

-- Obtener producto por ID
DELIMITER //
CREATE PROCEDURE sp_get_product(IN p_id INT)
BEGIN
    SELECT p.id, p.name, p.category_id, c.name AS category_name,
           p.price, p.cost, p.description, p.badge, p.image
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE p.id = p_id;
END //
DELIMITER ;

-- Crear producto
DELIMITER //
CREATE PROCEDURE sp_create_product(
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255)
)
BEGIN
    INSERT INTO products (name, category_id, price, cost, description, badge, image)
    VALUES (p_name, p_category_id, p_price, p_cost, p_description, p_badge, p_image);
    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar producto
DELIMITER //
CREATE PROCEDURE sp_update_product(
    IN p_id INT,
    IN p_name VARCHAR(150),
    IN p_category_id INT,
    IN p_price DECIMAL(10,2),
    IN p_cost DECIMAL(10,2),
    IN p_description TEXT,
    IN p_badge VARCHAR(50),
    IN p_image VARCHAR(255)
)
BEGIN
    UPDATE products
    SET name = p_name, category_id = p_category_id, price = p_price,
        cost = p_cost, description = p_description, badge = p_badge, image = p_image
    WHERE id = p_id;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/categories` | Listar categorías | Sí |
| `GET` | `/api/products` | Listar productos (?category=) | Sí |
| `GET` | `/api/products/:id` | Obtener producto | Sí |
| `POST` | `/api/products` | Crear producto | Admin |
| `PUT` | `/api/products/:id` | Actualizar producto | Admin |
| `DELETE` | `/api/products/:id` | Desactivar producto | Admin |

---

## 4. Archivos Backend

```
back-end/src/
├── routes/
│   ├── categories.js
│   └── products.js
├── controllers/
│   ├── categoryController.js
│   └── productController.js
└── models/
    └── product.js
```

---

## 5. Componentes React

```
front-end/src/
├── pages/
│   └── POSPage.jsx           # Terminal POS principal
├── components/
│   ├── ProductGrid.jsx       # Grid de productos por categoría
│   ├── ProductCard.jsx       # Tarjeta de producto
│   ├── CategoryTabs.jsx      # Tabs de categorías
│   └── ProductManagement.jsx # CRUD productos (admin)
├── hooks/
│   └── useProducts.js        # Hook para obtener productos
└── api/
    └── products.js
```

### Layout del POS:
```
┌─────────────────────────────────────────┐
│  [Café Caliente] [Fríos] [Pastelería]  │  ← CategoryTabs
├───────────────────────┬─────────────────┤
│                       │                 │
│   ProductGrid         │   Ticket        │
│   ┌─────┐ ┌─────┐    │   ┌───────────┐ │
│   │Prod1│ │Prod2│    │   │ Item 1    │ │
│   └─────┘ └─────┘    │   │ Item 2    │ │
│   ┌─────┐ ┌─────┐    │   │           │ │
│   │Prod3│ │Prod4│    │   ├───────────┤ │
│   └─────┘ └─────┘    │   │ Subtotal  │ │
│                       │   │ IVA       │ │
│                       │   │ Total     │ │
│                       │   └───────────┘ │
└───────────────────────┴─────────────────┘
```

---

## 6. Pruebas

### Jest:
```javascript
describe('Product Controller', () => {
  test(' listar productos retorna array')
  test(' filtrar por categoría retorna solo esa categoría')
  test('admin puede crear producto')
  test('barista no puede crear producto')
})
```

### Playwright:
```javascript
test('POS muestra productos de todas las categorías', async ({ page }) => {
  await loginAs('admin')
  await page.goto('/#/pos')
  await expect(page.locator('[data-category="cafe-caliente"]')).toBeVisible()
})

test('cambiar categoría muestra productos correspondientes', async ({ page }) => {
  await page.click('[data-category="frios"]')
  await expect(page.locator('.product-card')).toHaveCount(2)
})
```

---

## 7. Datos Semilla

```sql
INSERT INTO categories (name, icon, display_order) VALUES
('Café Caliente', 'coffee', 1),
('Fríos & Cold Brew', 'local_drink', 2),
('Pastelería', 'bakery_dining', 3),
('Tés', 'emoji_food_beverage', 4),
('Retail', 'shopping_bag', 5);

-- 15 productos del prototipo
INSERT INTO products (name, category_id, price, cost, description, badge) VALUES
('Latte Vainilla', 1, 28.00, 8.50, 'Suave y aromático', 'Popular'),
('Flat White Doble', 1, 26.00, 7.80, 'Doble espresso con microespuma', NULL),
('Cold Brew Nitro', 2, 32.00, 9.20, 'Nitrogenizado y refrescante', 'Top Seller'),
-- ... (resto de productos del prototipo)
```

---

## 8. Criterios de Aceptación

- [ ] Categorías se muestran como tabs en POS
- [ ] Productos se filtran por categoría
- [ ] Cada producto muestra nombre, precio e imagen
- [ ] Admin puede crear/editar/desactivar productos
- [ ] Productos inactivos no aparecen en POS
- [ ] Costo se almacena pero no se muestra al barista
