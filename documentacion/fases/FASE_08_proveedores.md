# Fase 8: Proveedores

## Objetivo
Implementar la gestión de proveedores con historial de compras y órdenes de compra.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 8: Proveedores
-- ============================================

CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    status ENUM('Activo', 'Inactivo') DEFAULT 'Activo',
    notes TEXT,
    pending_payment DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT NOT NULL,
    status ENUM('pending', 'received', 'cancelled') DEFAULT 'pending',
    total DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by INT NOT NULL,
    received_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE purchase_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    inventory_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (inventory_id) REFERENCES inventory(id) ON DELETE RESTRICT
);

-- Índices
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
```

---

## 2. Procedimientos Almacenados

```sql
-- Listar proveedores
DELIMITER //
CREATE PROCEDURE sp_list_suppliers()
BEGIN
    SELECT id, name, contact_name, phone, email, address, status,
           pending_payment, created_at
    FROM suppliers
    WHERE status = 'Activo'
    ORDER BY name;
END //
DELIMITER ;

-- Detalle de proveedor con historial
DELIMITER //
CREATE PROCEDURE sp_get_supplier_detail(IN p_supplier_id INT)
BEGIN
    -- Info del proveedor
    SELECT id, name, contact_name, phone, email, address, status,
           pending_payment, notes
    FROM suppliers WHERE id = p_supplier_id;

    -- Historial de órdenes de compra
    SELECT po.id, po.status, po.total, po.created_at, po.received_at,
           u.name AS created_by_name
    FROM purchase_orders po
    JOIN users u ON po.created_by = u.id
    WHERE po.supplier_id = p_supplier_id
    ORDER BY po.created_at DESC
    LIMIT 10;
END //
DELIMITER ;

-- Crear orden de compra
DELIMITER //
CREATE PROCEDURE sp_create_purchase_order(
    IN p_supplier_id INT,
    IN p_notes TEXT,
    IN p_created_by INT
)
BEGIN
    INSERT INTO purchase_orders (supplier_id, notes, created_by)
    VALUES (p_supplier_id, p_notes, p_created_by);

    SELECT LAST_INSERT_ID() AS po_id;
END //
DELIMITER ;

-- Agregar ítem a orden de compra
DELIMITER //
CREATE PROCEDURE sp_add_po_item(
    IN p_po_id INT,
    IN p_inventory_id INT,
    IN p_quantity DECIMAL(10,3),
    IN p_unit_cost DECIMAL(10,2)
)
BEGIN
    INSERT INTO purchase_order_items (po_id, inventory_id, quantity, unit_cost)
    VALUES (p_po_id, p_inventory_id, p_quantity, p_unit_cost);

    -- Actualizar total de la PO
    UPDATE purchase_orders
    SET total = (SELECT IFNULL(SUM(quantity * unit_cost), 0) FROM purchase_order_items WHERE po_id = p_po_id)
    WHERE id = p_po_id;
END //
DELIMITER ;

-- Recibir orden de compra (actualiza inventario)
DELIMITER //
CREATE PROCEDURE sp_receive_purchase_order(IN p_po_id INT)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_inv_id INT;
    DECLARE v_qty DECIMAL(10,3);

    DECLARE cur CURSOR FOR
        SELECT inventory_id, quantity FROM purchase_order_items WHERE po_id = p_po_id;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    OPEN cur;
    receive_loop: LOOP
        FETCH cur INTO v_inv_id, v_qty;
        IF v_done THEN LEAVE receive_loop; END IF;
        UPDATE inventory SET stock = stock + v_qty WHERE id = v_inv_id;
    END LOOP receive_loop;
    CLOSE cur;

    UPDATE purchase_orders SET status = 'received', received_at = CURRENT_TIMESTAMP WHERE id = p_po_id;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/suppliers` | Listar proveedores | Sí |
| `GET` | `/api/suppliers/:id` | Detalle con historial | Sí |
| `POST` | `/api/suppliers` | Crear proveedor | Admin |
| `PUT` | `/api/suppliers/:id` | Actualizar proveedor | Admin |
| `POST` | `/api/purchase-orders` | Crear PO | Admin |
| `POST` | `/api/purchase-orders/:id/items` | Agregar ítem a PO | Admin |
| `PUT` | `/api/purchase-orders/:id/receive` | Recibir PO | Admin |

---

## 4. Componentes React

```
front-end/src/
├── pages/
│   ├── SuppliersPage.jsx
│   └── SupplierDetailPage.jsx
├── components/
│   ├── SupplierCard.jsx
│   ├── SupplierForm.jsx
│   ├── PurchaseOrderForm.jsx
│   └── PurchaseOrderHistory.jsx
└── api/
    └── suppliers.js
```

---

## 5. Datos Semilla

```sql
INSERT INTO suppliers (name, contact_name, phone, email, address, pending_payment) VALUES
('Cafés del Valle S.A.', 'Roberto Méndez', '+502 5555-0101', 'ventas@cafesdelvalle.com', 'Zona 10, Guatemala', 0),
('Lácteos Frescos Ltda.', 'María García', '+502 5555-0102', 'pedidos@lacteosfrescos.com', 'Carretera a El Salvador', 2500.00),
('Importaciones Gourmet', 'Carlos Ruiz', '+502 5555-0103', 'info@importacionesgourmet.com', 'Zona 4, Guatemala', 0);
```

---

## 6. Criterios de Aceptación

- [ ] Lista de proveedores muestra info de contacto y saldo pendiente
- [ ] Detalle muestra historial de órdenes de compra
- [ ] Se puede crear orden de compra con múltiples ítems
- [ ] Recibir PO actualiza inventario automáticamente
- [ ] Admin puede gestionar proveedores y POs
