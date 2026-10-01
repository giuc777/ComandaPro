# Fase 9: Mesas

## Objetivo
Gestionar el estado de las mesas con **dos estados: libre (`free`) / ocupada (`occupied`)**, vinculadas a su orden activa, con la posibilidad de cambiar el estado **manualmente** cuando la operación lo requiere.

> **Decisión de diseño (2026-09-30):** se eliminó el tercer estado `dirty` (sucia).
> Al **cobrar** y al **anular** una orden la mesa vuelve directamente a `free`;
> si una sala necesita registrar "mesa sucia" se hace con el cambio manual
> (`occupied`) hasta que se libere. Migración: `020_mesa_libre_ocupada.sql`.

---

## 1. Tablas SQL

```sql
-- Estado actual (database/01_create_tables.sql + migracion 020)
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    capacity INT NOT NULL DEFAULT 4,
    status ENUM('free', 'occupied') DEFAULT 'free',
    current_order_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- orders.table_id      -> tables.id (FK ON DELETE SET NULL)
-- catalog_items.table_id -> tables.id (alta/baja de mesas desde Catalogos)
```

Nota: no existe `idx_tables_status` ni FK sobre `current_order_id` (el esquema
real solo declara la PK); `sp_list_tables` es el único lector para el POS.

---

## 2. Procedimientos Almacenados

### 2.1 Lectura
```sql
sp_list_tables()   -- id, name, capacity, status, current_order_id (GET /api/tables)
```

### 2.2 Cambio manual (implementado)
```sql
sp_update_table_status(p_table_id, p_status)  -- 'free' | 'occupied'
-- valida estado desconocido        -> 45000 'Estado invalido: use free u occupied'
-- valida mesa inexistente          -> 45000 'Mesa no encontrada'
-- liberar con orden activa         -> 45000 'La mesa tiene la orden #N activa; anula o cobra la orden primero'
-- ocupar sin orden                 -> permitido (mesa reservada, current_order_id NULL)
-- devuelve la fila actualizada
```

### 2.3 Transiciones automáticas (implementadas)
| Evento | Procedimiento | Efecto sobre `tables` |
|--------|---------------|-----------------------|
| Crear orden en mesa | `sp_create_parked_order` | valida la mesa (**45000 'La mesa esta ocupada'** si tiene otra orden activa) y la marca `occupied` + `current_order_id` |
| Cobrar | `sp_record_payment` | `free` + `current_order_id = NULL` |
| Anular orden | `sp_void_order` | `free` si la mesa apuntaba a esa orden |
| Cambiar la mesa de una orden | `sp_reopen_order` | libera la origen, ocupa la destino y devuelve **45000 'La mesa esta ocupada'** si la destino tiene otra orden activa |

### 2.4 No implementados (y por qué)
- `sp_assign_order_to_table`: la asignación la hacen `sp_create_parked_order`
  (alta) y `sp_reopen_order` (cambio de mesa).
- `sp_clean_table`: innecesario con dos estados (al cobrar ya queda `free`).
- `sp_get_tables`: el listado real es `sp_list_tables`.

---

## 3. Endpoints REST

| Método | Ruta | Descripción | Auth / permiso |
|--------|------|-------------|----------------|
| `GET` | `/api/tables` | Listar mesas con estado | Token (cualquier rol) |
| `PUT` | `/api/tables/:id/status` | Cambio manual libre ↔ ocupada | Token + módulo `pos` (cualquier rol con POS; Administrador siempre) |

Respuestas del `PUT`: `200` con la mesa actualizada · `400` estado inválido ·
`401` sin token · `403` sin módulo `pos` · `404` mesa inexistente ·
`409` si se intenta liberar una mesa con orden activa.

---

## 4. Componentes React

```
front-end/src/
├── components/
│   └── TableSelector.jsx   # Selector de mesa en POS y en OrderEditModal:
│                           #   chip Libre/Ocupada + botón manual (lock/lock_open)
├── pages/
│   ├── PosPage.jsx         # recarga la lista tras un cambio manual y muestra el error 409
│   └── CatalogoDetallePage.jsx  # columna "Estado" y selector Estado en el modal de mesa
└── api/apiClient.js        # getTables() / updateTableStatus(id, status)
```

### Visual:
```
┌──────────┬──────────┐
│ Mesa 1   │ Mesa 2   │
│ 🟢 Libre │ 🔴 Ocup. │   🔓 = marcar ocupada
├──────────┼──────────┤   🔒 = marcar libre
│ Mesa 3   │ Mesa 4   │
│ 🔴 Ocup. │ 🟢 Libre │
└──────────┴──────────┘

🟢 Libre   🔴 Ocupada
```

No existen `TableGrid.jsx` ni `TableCard.jsx` (la cuadrícula vive dentro de
`TableSelector`); no hay una ruta propia de mesas.

---

## 5. Datos Semilla

8 mesas en `Deploy/Produccion/seed.sql` y `Deploy/Test/seed.sql`
(Mesa 1-3, Terraza A/B, Barra Principal, Sala Privada, Area de Estudio),
todas con `status='free'` y `current_order_id=NULL`.

---

## 6. Criterios de Aceptación

- [x] `tables.status` tiene **solo dos estados**: `free` y `occupied` (migración 020)
- [x] Al crear una orden en una mesa, la mesa queda `occupied` con `current_order_id`
- [x] Crear una segunda orden en esa misma mesa devuelve **409**
- [x] Al cobrar, la mesa vuelve a `free` (sin estado intermedio)
- [x] Al anular una orden, la mesa que apuntaba a ella vuelve a `free`
- [x] Cambiar la mesa de una orden libera la origen y ocupa la destino
- [x] Mover una orden a una mesa con otra orden activa devuelve **409**
- [x] Cambio manual libre ↔ ocupada desde el selector de mesas (POS/edición) y desde Catálogos
- [x] Liberar manualmente una mesa con orden activa devuelve **409**
- [x] Marcar `occupied` sin orden está permitido (mesa reservada)
- [x] Mesas editables desde Catálogos (grupo "Mesas") con capacidad y estado
- [x] `GET /api/tables` nunca devuelve estados ajenos a `free`/`occupied`

### Verificación automatizada
`test_mesas.ps1` — 17/17 casos (M1–M13). Regresión completa alrededor:
`test_d` 18/18 · `test_h` 26/26 · `test_e` 21/21 · `test_e_modal` 17/17 ·
`test_f` 15/15 · `test_f1_api` 13/13 (total 127/127).
