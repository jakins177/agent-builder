/**
 * Database connection and configuration
 * Uses MySQL2 with connection pooling
 */

import mysql from 'mysql2/promise';
import { log } from '@/lib/logger';

log('Initializing database connection...', 'INFO');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'agent_builder',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    log('Creating new connection pool...', 'INFO');
    pool = mysql.createPool(dbConfig);
    log('Connection pool created successfully', 'INFO');
    log('Configuration: ' + JSON.stringify({
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      hasPassword: !!dbConfig.password
    }, null, 2), 'DEBUG');
  }
  return pool;
}

export async function testConnection(): Promise<boolean> {
  log('Testing database connection...', 'INFO');
  try {
    const connection = await getPool().getConnection();
    log('Database connection successful', 'INFO');
    connection.release();
    return true;
  } catch (error) {
    log('Database connection failed: ' + (error as Error).message, 'ERROR');
    return false;
  }
}

export async function closeConnection(): Promise<void> {
  if (pool) {
    log('Closing connection pool...', 'INFO');
    await pool.end();
    pool = null;
    log('Connection pool closed', 'INFO');
  }
}
