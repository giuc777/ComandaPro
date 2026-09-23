DELIMITER //
DROP PROCEDURE IF EXISTS sp_list_users_admin //
CREATE PROCEDURE sp_list_users_admin()
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal,
           active, failed_attempts, locked_until, created_at,
           CASE WHEN locked_until IS NOT NULL AND locked_until > NOW()
                THEN 1 ELSE 0 END AS is_locked
    FROM users
    ORDER BY active DESC, name;
END //

DROP PROCEDURE IF EXISTS sp_get_user_by_id //
CREATE PROCEDURE sp_get_user_by_id(IN p_id INT)
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal, active
    FROM users WHERE id = p_id;
END //

-- Redefine sp_update_user para permitir actualizaciones parciales
-- (COALESCE conserva el valor actual cuando llega NULL)
DROP PROCEDURE IF EXISTS sp_update_user //
CREATE PROCEDURE sp_update_user(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero'),
    IN p_active BOOLEAN
)
BEGIN
    UPDATE users
    SET name = COALESCE(p_name, name),
        email = COALESCE(p_email, email),
        role = COALESCE(p_role, role),
        active = COALESCE(p_active, active)
    WHERE id = p_id;

    SELECT ROW_COUNT() AS affected;
END //

DROP PROCEDURE IF EXISTS sp_set_user_active //
CREATE PROCEDURE sp_set_user_active(IN p_id INT, IN p_active BOOLEAN)
BEGIN
    UPDATE users SET active = p_active WHERE id = p_id;
    SELECT ROW_COUNT() AS affected;
END //

DROP PROCEDURE IF EXISTS sp_get_settings //
CREATE PROCEDURE sp_get_settings()
BEGIN
    SELECT setting_key, setting_value FROM settings;
END //

DROP PROCEDURE IF EXISTS sp_update_setting //
CREATE PROCEDURE sp_update_setting(
    IN p_key VARCHAR(64),
    IN p_value VARCHAR(255)
)
BEGIN
    INSERT INTO settings (setting_key, setting_value)
    VALUES (p_key, p_value)
    ON DUPLICATE KEY UPDATE setting_value = p_value;
    SELECT ROW_COUNT() AS affected;
END //

DROP PROCEDURE IF EXISTS sp_get_role_permissions //
CREATE PROCEDURE sp_get_role_permissions()
BEGIN
    SELECT role, module_key, allowed
    FROM role_permissions
    ORDER BY role, module_key;
END //

DROP PROCEDURE IF EXISTS sp_set_role_permission //
CREATE PROCEDURE sp_set_role_permission(
    IN p_role VARCHAR(20),
    IN p_module_key VARCHAR(40),
    IN p_allowed BOOLEAN
)
BEGIN
    INSERT INTO role_permissions (role, module_key, allowed)
    VALUES (p_role, p_module_key, p_allowed)
    ON DUPLICATE KEY UPDATE allowed = p_allowed;
END //

DROP PROCEDURE IF EXISTS sp_get_permissions_for_role //
CREATE PROCEDURE sp_get_permissions_for_role(IN p_role VARCHAR(20))
BEGIN
    SELECT module_key, allowed
    FROM role_permissions
    WHERE role = p_role;
END //
DELIMITER ;
