-- ============================================
-- DeerCoffee / ComandaPro - migracion 019
-- FASE 05, sub-fase H: editar (agregar) items a ordenes en curso
--
-- sp_send_to_kitchen:
--   * acepta cualquier estado activo: pausada, enviada, preparando, lista,
--     completada (sigue bloqueando pagada / anulada)
--   * solo marca como enviados los items con sent = 0 (los entregados no cambian)
--   * si no hay items pendientes -> 45000 "No hay items nuevos..."
--     (conserva el bloqueo de doble envio de la sub-fase D)
--   * al salir de pausada / lista / completada renueva sent_at y limpia
--     ready_at / completed_at para que el cronometro del KDS y los tiempos
--     de cocina correspondan al nuevo ciclo
--
-- Idempotente: DROP PROCEDURE IF EXISTS + CREATE, se puede re-ejecutar.
--
-- Verificacion post-aplicacion:
--   SHOW CREATE PROCEDURE sp_send_to_kitchen;
--   -- debe contener v_pending y "No hay items nuevos para enviar a cocina"
--
-- Aplicar:
--   mysql comandapro < database/migrations/019_editar_ordenes_activas.sql
-- ============================================
USE comandapro;

DROP PROCEDURE IF EXISTS `sp_send_to_kitchen`;
DELIMITER //
CREATE PROCEDURE `sp_send_to_kitchen`(IN p_order_id INT)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_items INT DEFAULT 0;
    DECLARE v_pending INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT status INTO v_status FROM orders WHERE id = p_order_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Orden no encontrada';
    END IF;

    IF v_status IN ('pagada', 'anulada') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se puede enviar una orden pagada o anulada';
    END IF;

    SELECT COUNT(*) INTO v_items FROM order_items WHERE order_id = p_order_id;

    IF v_items = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'La orden no tiene items para enviar a cocina';
    END IF;

    SELECT COUNT(*) INTO v_pending FROM order_items
    WHERE order_id = p_order_id AND sent = 0;

    IF v_pending = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No hay items nuevos para enviar a cocina';
    END IF;

    UPDATE order_items
    SET sent = 1, sent_at = CURRENT_TIMESTAMP
    WHERE order_id = p_order_id AND sent = 0;

    UPDATE orders
    SET status = 'enviada'
    WHERE id = p_order_id;

    IF v_status IN ('pausada', 'lista', 'completada') THEN
        UPDATE orders
        SET sent_at = CURRENT_TIMESTAMP,
            ready_at = NULL,
            completed_at = NULL
        WHERE id = p_order_id;
    END IF;

    COMMIT;

    SELECT id, status, sent_at FROM orders WHERE id = p_order_id;
END //
DELIMITER ;
