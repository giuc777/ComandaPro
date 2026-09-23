-- ============================================
-- Migracion 015: Settings globales + Permisos por rol
-- ============================================
USE comandapro;

-- Tabla de configuracion global (key-value)
CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de permisos por rol
CREATE TABLE IF NOT EXISTS role_permissions (
    role ENUM('Administrador', 'Barista', 'Cajero') NOT NULL,
    module_key VARCHAR(40) NOT NULL,
    allowed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (role, module_key)
);

-- Semilla: nombre de sucursal
INSERT INTO settings (setting_key, setting_value) VALUES
    ('sucursal_nombre', 'Roma Norte')
ON DUPLICATE KEY UPDATE setting_value = setting_value;

-- Semilla: permisos por defecto
-- Módulos: dashboard, pos, kds, caja, productos, inventario, proveedores, catalogos, reportes, ajustes
INSERT INTO role_permissions (role, module_key, allowed) VALUES
    -- Administrador: todo
    ('Administrador', 'dashboard',    TRUE),
    ('Administrador', 'pos',          TRUE),
    ('Administrador', 'kds',          TRUE),
    ('Administrador', 'caja',         TRUE),
    ('Administrador', 'productos',    TRUE),
    ('Administrador', 'inventario',   TRUE),
    ('Administrador', 'proveedores',  TRUE),
    ('Administrador', 'catalogos',    TRUE),
    ('Administrador', 'reportes',     TRUE),
    ('Administrador', 'ajustes',      TRUE),
    -- Barista
    ('Barista', 'dashboard',    TRUE),
    ('Barista', 'pos',          TRUE),
    ('Barista', 'kds',          TRUE),
    ('Barista', 'caja',         TRUE),
    ('Barista', 'productos',    FALSE),
    ('Barista', 'inventario',   FALSE),
    ('Barista', 'proveedores',  FALSE),
    ('Barista', 'catalogos',    FALSE),
    ('Barista', 'reportes',     FALSE),
    ('Barista', 'ajustes',      TRUE),
    -- Cajero
    ('Cajero', 'dashboard',    TRUE),
    ('Cajero', 'pos',          TRUE),
    ('Cajero', 'kds',          FALSE),
    ('Cajero', 'caja',         TRUE),
    ('Cajero', 'productos',    FALSE),
    ('Cajero', 'inventario',   FALSE),
    ('Cajero', 'proveedores',  FALSE),
    ('Cajero', 'catalogos',    FALSE),
    ('Cajero', 'reportes',     FALSE),
    ('Cajero', 'ajustes',      TRUE)
ON DUPLICATE KEY UPDATE allowed = VALUES(allowed);
