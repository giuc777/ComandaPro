import bcrypt from 'bcryptjs';

const WORK_FACTOR = 12;

async function generateHashes() {
    const adminHash = await bcrypt.hash('admin123', WORK_FACTOR);
    const baristaHash = await bcrypt.hash('barista123', WORK_FACTOR);
    
    console.log('Admin hash:', adminHash);
    console.log('Barista hash:', baristaHash);
    
    // Generate the SQL
    const sql = `-- ============================================
-- DATOS SEMILLA - FASE 1
-- ComandaPro - MariaDB
-- ============================================

USE comandapro;

-- Usuarios de prueba
INSERT INTO users (username, password_hash, name, email, role, avatar, sucursal)
VALUES
    ('admin', '${adminHash}', 'Administrador', 'admin@comandapro.com', 'Administrador', 'A', 'Roma Norte'),
    ('mateo', '${baristaHash}', 'Mateo García', 'mateo@comandapro.com', 'Barista', 'M', 'Roma Norte'),
    ('lucia', '${baristaHash}', 'Lucía Martínez', 'lucia@comandapro.com', 'Barista', 'L', 'Roma Norte'),
    ('carlos', '${baristaHash}', 'Carlos López', 'carlos@comandapro.com', 'Cajero', 'C', 'Roma Norte');
`;

    const fs = await import('fs');
    fs.writeFileSync('database/seed.sql', sql);
    console.log('Seed file created: database/seed.sql');
}

generateHashes().catch(console.error);
