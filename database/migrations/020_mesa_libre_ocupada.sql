-- ============================================
-- DeerCoffee / ComandaPro - migracion 020
-- Estado de mesa: solo dos estados (libre / ocupada)
--
--   tables.status : enum('free','occupied','dirty') -> enum('free','occupied')
--
-- Saneamiento previo al ALTER (idempotente):
--   * 'dirty'  -> 'free'  (nada en el codigo podia volver a escribir 'free':
--                         tras cobrar la mesa quedaba 'dirty' para siempre)
--   * 'occupied' con current_order_id NULL o con la orden ya pagada/anulada
--     -> 'free'  (mesas "fantasma", p.ej. orden anulada sin liberar la mesa)
--
-- Nota: MySQL no permite eliminar un valor de un ENUM con UPDATE directo;
-- primero se reubican las filas y despues se redefine la columna.
--
-- Idempotente: se puede re-ejecutar sin efecto.
--
-- Verificacion post-aplicacion:
--   SHOW CREATE TABLE tables;          -- enum('free','occupied')
--   SELECT status, COUNT(*) FROM tables GROUP BY status;  -- solo free/occupied
--
-- Aplicar:
--   mysql comandapro < database/migrations/020_mesa_libre_ocupada.sql
-- ============================================
USE comandapro;

-- 1) saneamiento de datos existentes
UPDATE tables t
LEFT JOIN orders o ON o.id = t.current_order_id
SET t.status = 'free', t.current_order_id = NULL
WHERE t.status = 'dirty'
   OR t.current_order_id IS NULL AND t.status = 'occupied' AND o.id IS NULL
   OR t.status = 'occupied' AND o.id IS NOT NULL AND o.status IN ('pagada', 'anulada');

-- 2) el ENUM queda en dos estados
ALTER TABLE tables
    MODIFY status ENUM('free', 'occupied') DEFAULT 'free';

-- 3) verificacion
SELECT id, name, status, current_order_id FROM tables ORDER BY id;
