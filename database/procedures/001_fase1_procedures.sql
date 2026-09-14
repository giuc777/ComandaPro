-- ============================================
-- PROCEDIMIENTOS ALMACENADOS - FASE 1
-- ComandaPro - MariaDB
-- ============================================

USE comandapro;

-- ============================================
-- USUARIOS
-- ============================================

-- Obtener usuario por username
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_get_user_by_username(IN p_username VARCHAR(50))
BEGIN
    SELECT id, username, password_hash, name, email, role, avatar,
           sucursal, active, failed_attempts, locked_until
    FROM users
    WHERE username = p_username;
END //
DELIMITER ;

-- Listar usuarios activos
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_list_users()
BEGIN
    SELECT id, username, name, email, role, avatar, sucursal, active, created_at
    FROM users
    WHERE active = TRUE
    ORDER BY name;
END //
DELIMITER ;

-- Crear usuario
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_user(
    IN p_username VARCHAR(50),
    IN p_password_hash VARCHAR(255),
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero')
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        RESIGNAL;
    END;

    INSERT INTO users (username, password_hash, name, email, role)
    VALUES (p_username, p_password_hash, p_name, p_email, p_role);

    SELECT LAST_INSERT_ID() AS id;
END //
DELIMITER ;

-- Actualizar usuario
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_update_user(
    IN p_id INT,
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(100),
    IN p_role ENUM('Administrador', 'Barista', 'Cajero'),
    IN p_active BOOLEAN
)
BEGIN
    UPDATE users
    SET name = p_name, email = p_email, role = p_role, active = p_active
    WHERE id = p_id;

    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Cambiar contraseña
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_change_password(
    IN p_id INT,
    IN p_new_password_hash VARCHAR(255)
)
BEGIN
    UPDATE users
    SET password_hash = p_new_password_hash,
        failed_attempts = 0,
        locked_until = NULL
    WHERE id = p_id;

    SELECT ROW_COUNT() AS affected;
END //
DELIMITER ;

-- Registrar intento fallido
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_record_failed_attempt(IN p_user_id INT)
BEGIN
    UPDATE users
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE
            WHEN failed_attempts >= 4 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
            ELSE locked_until
        END
    WHERE id = p_user_id;
END //
DELIMITER ;

-- Resetear intentos fallidos
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_reset_failed_attempts(IN p_user_id INT)
BEGIN
    UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = p_user_id;
END //
DELIMITER ;

-- ============================================
-- REFRESH TOKENS
-- ============================================

-- Crear refresh token
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_create_refresh_token(
    IN p_user_id INT,
    IN p_token_hash VARCHAR(64),
    IN p_expires_at TIMESTAMP,
    IN p_user_agent VARCHAR(500),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
    VALUES (p_user_id, p_token_hash, p_expires_at, p_user_agent, p_ip_address);
END //
DELIMITER ;

-- Validar refresh token
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_validate_refresh_token(IN p_token_hash VARCHAR(64))
BEGIN
    SELECT rt.id, rt.user_id, rt.expires_at,
           u.username, u.name, u.role, u.email, u.avatar, u.sucursal
    FROM refresh_tokens rt
    JOIN users u ON rt.user_id = u.id
    WHERE rt.token_hash = p_token_hash
      AND rt.revoked = FALSE
      AND rt.expires_at > NOW()
      AND u.active = TRUE;
END //
DELIMITER ;

-- Revocar refresh token
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_revoke_refresh_token(
    IN p_token_hash VARCHAR(64),
    IN p_replaced_by VARCHAR(64)
)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE,
        revoked_at = NOW(),
        replaced_by = p_replaced_by
    WHERE token_hash = p_token_hash;
END //
DELIMITER ;

-- Revocar todos los refresh tokens de un usuario
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_revoke_all_user_tokens(IN p_user_id INT)
BEGIN
    UPDATE refresh_tokens
    SET revoked = TRUE, revoked_at = NOW()
    WHERE user_id = p_user_id AND revoked = FALSE;
END //
DELIMITER ;

-- Limpiar tokens expirados
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_clean_expired_tokens()
BEGIN
    DELETE FROM refresh_tokens
    WHERE expires_at < NOW() OR revoked = TRUE;
END //
DELIMITER ;

-- ============================================
-- TOKEN BLACKLIST
-- ============================================

-- Agregar JTI a blacklist
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_add_to_blacklist(
    IN p_jti VARCHAR(50),
    IN p_user_id INT,
    IN p_expires_at TIMESTAMP,
    IN p_reason VARCHAR(200)
)
BEGIN
    INSERT INTO token_blacklist (jti, user_id, expires_at, reason)
    VALUES (p_jti, p_user_id, p_expires_at, p_reason);
END //
DELIMITER ;

-- Verificar si JTI está en blacklist
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_is_jti_blacklisted(IN p_jti VARCHAR(50))
BEGIN
    SELECT COUNT(*) AS is_blacklisted
    FROM token_blacklist
    WHERE jti = p_jti AND expires_at > NOW();
END //
DELIMITER ;

-- Limpiar blacklist expirada
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS sp_clean_expired_blacklist()
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END //
DELIMITER ;
