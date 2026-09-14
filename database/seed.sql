-- ============================================
-- DATOS SEMILLA - FASE 1
-- ComandaPro - MariaDB
-- ============================================

USE comandapro;

-- Usuarios de prueba
INSERT INTO users (username, password_hash, name, email, role, avatar, sucursal)
VALUES
    ('admin', '$2b$12$d4t5Ym6KzTjp2/oYyY36fe.OLoZ825/ftAB21dVu0Cs8guT3h86Ca', 'Administrador', 'admin@comandapro.com', 'Administrador', 'A', 'Roma Norte'),
    ('mateo', '$2b$12$lr9r3JiB0S7K7pd.adxRjOtPE8FwAR8HZmeDCvfdTq2ZkBfboupYG', 'Mateo García', 'mateo@comandapro.com', 'Barista', 'M', 'Roma Norte'),
    ('lucia', '$2b$12$lr9r3JiB0S7K7pd.adxRjOtPE8FwAR8HZmeDCvfdTq2ZkBfboupYG', 'Lucía Martínez', 'lucia@comandapro.com', 'Barista', 'L', 'Roma Norte'),
    ('carlos', '$2b$12$lr9r3JiB0S7K7pd.adxRjOtPE8FwAR8HZmeDCvfdTq2ZkBfboupYG', 'Carlos López', 'carlos@comandapro.com', 'Cajero', 'C', 'Roma Norte');
