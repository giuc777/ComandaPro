import dotenv from 'dotenv';
import mariadb from 'mariadb';

dotenv.config();

const pool = mariadb.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'comandapro_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'comandapro',
    connectionLimit: 5
});

export const config = {
    port: process.env.PORT || 3001,
    pool
};
