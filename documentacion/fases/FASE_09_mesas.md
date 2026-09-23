# Fase 9: Mesas

## Objetivo
Implementar la gestión de mesas con estados (libre/ocupada/sucia) y vinculación a órdenes activas.

---

## 1. Tablas SQL

```sql
-- ============================================
-- FASE 9: Mesas
-- ============================================

CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status ENUM('free', 'occupied', 'dirty') DEFAULT 'free',
    current_order_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (current_order_id) REFERENCES orders(id) ON DELETE SET NULL
);

-- Índices
CREATE INDEX idx_tables_status ON tables(status);
```

---

## 2. Procedimientos Almacenados

```sql
-- Listar mesas con estado
DELIMITER //
CREATE PROCEDURE sp_get_tables()
BEGIN
    SELECT t.id, t.name, t.capacity, t.status, t.current_order_id,
           o.id AS active_order_id, o.status AS order_status,
           o.total AS order_total
    FROM tables t
    LEFT JOIN orders o ON t.current_order_id = o.id
    ORDER BY t.id;
END //
DELIMITER ;

-- Actualizar estado de mesa
DELIMITER //
CREATE PROCEDURE sp_update_table_status(
    IN p_table_id INT,
    IN p_status ENUM('free', 'occupied', 'dirty')
)
BEGIN
    UPDATE tables SET status = p_status WHERE id = p_table_id;

    IF p_status = 'free' THEN
        UPDATE tables SET current_order_id = NULL WHERE id = p_table_id;
    END IF;
END //
DELIMITER ;

-- Asignar orden a mesa
DELIMITER //
CREATE PROCEDURE sp_assign_order_to_table(
    IN p_table_id INT,
    IN p_order_id INT
)
BEGIN
    UPDATE tables
    SET status = 'occupied', current_order_id = p_order_id
    WHERE id = p_table_id;
END //
DELIMITER ;

-- Limpiar mesa
DELIMITER //
CREATE PROCEDURE sp_clean_table(IN p_table_id INT)
BEGIN
    UPDATE tables SET status = 'free', current_order_id = NULL WHERE id = p_table_id;
END //
DELIMITER ;
```

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| `GET` | `/api/tables` | Listar mesas con estado | Sí |
| `PUT` | `/api/tables/:id/status` | Cambiar estado | Sí |
| `POST` | `/api/tables/:id/assign` | Asignar orden a mesa | Sí |
| `POST` | `/api/tables/:id/clean` | Limpiar mesa | Sí |

---

## 4. Componentes React

```
front-end/src/
├── components/
│   ├── TableSelector.jsx      # Selector de mesa en POS
│   ├── TableGrid.jsx          # Grid visual de mesas
│   └── TableCard.jsx          # Card individual de mesa
└── api/
    └── tables.js
```

### Layout Grid de Mesas:
```
┌──────────┬──────────┐
│ Mesa 1   │ Mesa 2   │  Cap 2
│ 🟢 Libre │ 🔴 Ocup. │
├──────────┼──────────┤
│ Mesa 3   │ Mesa 4   │
│ 🟡 Sucia │ 🟢 Libre │
├──────────┼──────────┤
│ Mesa 5   │ Mesa 6   │  Cap 4
│ 🔴 Ocup. │ 🟢 Libre │
└──────────┴──────────┘

🟢 Libre  🔴 Ocupada  🟡 Sucia
```

---

## 5. Datos Semilla

```sql
INSERT INTO tables (name, capacity) VALUES
('Mesa 1', 2), ('Mesa 2', 2), ('Mesa 3', 2), ('Mesa 4', 2),
('Mesa 5', 4), ('Mesa 6', 4), ('Mesa 7', 4), ('Mesa 8', 4),
('Mesa 9', 6), ('Mesa 10', 6), ('Mesa 11', 6), ('Mesa 12', 6);
```

---

## 6. Criterios de Aceptación

- [x] Grid de mesas muestra estado actual (libre/ocupada/sucia)
- [x] Selector de mesa en POS muestra solo mesas libres por defecto
- [x] Al crear orden, mesa se marca como ocupada
- [x] Al cobrar, mesa se marca como sucia
- [x] Al limpiar, mesa vuelve a libre
- [x] Mesas editables desde Catálogos (grupo "Mesas") con capacidad
- [x] TableSelector muestra puntos de color por status
