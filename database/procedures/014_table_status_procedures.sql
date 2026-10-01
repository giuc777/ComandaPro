-- ============================================
-- FASE 09: Procedimientos Almacenados - Estado de mesa
-- Dos estados: libre (free) / ocupada (occupied)
-- ============================================
USE comandapro;

-- Cambio manual de estado de mesa
--   * liberar: bloquea si la mesa tiene una orden activa (45000)
--   * ocupar:  permitido aunque no haya orden (mesa reservada)
DROP PROCEDURE IF EXISTS sp_update_table_status;
DELIMITER //
CREATE PROCEDURE sp_update_table_status(
    IN p_table_id INT,
    IN p_status VARCHAR(20)
)
BEGIN
    DECLARE v_current VARCHAR(20) DEFAULT NULL;
    DECLARE v_order_id INT DEFAULT NULL;
    DECLARE v_order_status VARCHAR(20) DEFAULT NULL;
    DECLARE v_message VARCHAR(128);

    IF p_status IS NULL OR p_status NOT IN ('free', 'occupied') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Estado invalido: use free u occupied';
    END IF;

    SELECT t.status, t.current_order_id, o.status
    INTO v_current, v_order_id, v_order_status
    FROM tables t
    LEFT JOIN orders o ON o.id = t.current_order_id
    WHERE t.id = p_table_id;

    IF v_current IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Mesa no encontrada';
    END IF;

    IF p_status = 'free'
        AND v_order_id IS NOT NULL
        AND v_order_status IS NOT NULL
        AND v_order_status NOT IN ('pagada', 'anulada') THEN
        SET v_message = CONCAT('La mesa tiene la orden #', v_order_id, ' activa; anula o cobra la orden primero');
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = v_message;
    END IF;

    IF p_status = 'free' THEN
        UPDATE tables SET status = 'free', current_order_id = NULL WHERE id = p_table_id;
    ELSE
        UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
    END IF;

    SELECT id, name, status, current_order_id
    FROM tables
    WHERE id = p_table_id;
END //
DELIMITER ;
