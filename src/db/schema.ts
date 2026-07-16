/* eslint-disable no-console */
import turso from './client.js';
import { simpleLog } from '../helpers/helpers.js';

export async function initializeDatabase() {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS listener_sessions (
        id TEXT PRIMARY KEY,
        ip_address TEXT,
        device_type TEXT,
        start_time INTEGER,
        end_time INTEGER,
        duration_seconds INTEGER,
        bytes_received INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS minute_metrics (
        id TEXT PRIMARY KEY,
        timestamp DATETIME,
        active_listeners INTEGER,
        new_connections INTEGER,
        disconnections INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS interval_metrics (
        id TEXT PRIMARY KEY,
        timestamp DATETIME,
        interval_minutes INTEGER,
        total_connections INTEGER,
        dropped_connections INTEGER,
        connection_errors INTEGER,
        drop_rate_percentage REAL,
        error_rate_percentage REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS hourly_unique_listeners (
        id TEXT PRIMARY KEY,
        hour DATETIME,
        unique_ip_count INTEGER,
        total_sessions INTEGER,
        avg_session_duration REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`\n  ${simpleLog()} ✅ Base de datos inicializada`);
    return true;
  } catch (error) {
    // ✅ CAMBIO: Loguear pero NO crashear
    console.warn(`${simpleLog()} ⚠️  BD no disponible: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    console.warn(`${simpleLog()} ℹ️  El servidor continuará sin persistir métricas`);
    return false;
  }
}