/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import { v4 as uuidv4 } from 'uuid';
import turso from '../db/client.js';
import { simpleLog } from '../helpers/helpers.js';

export interface ListenerSession {
  id: string;
  ipAddress: string;
  deviceType?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  bytesReceived: number;
  isDropped?: boolean;
}

export interface MinuteMetric {
  timestamp: Date;
  activeListeners: number;
  newConnections: number;
  disconnections: number;
}

export interface IntervalMetric {
  timestamp: Date;
  totalConnections: number;
  droppedConnections: number;
  connectionErrors: number;
  dropRatePercentage: number;
  errorRatePercentage: number;
}

export class AnalyticsService {
  private sessions = new Map<string, ListenerSession>();

  private minuteMetrics: MinuteMetric[] = [];

  private currentMinute = new Date();

  private currentInterval = new Date();

  private connectionsThisInterval = 0;

  private droppedThisInterval = 0;

  private errorsThisInterval = 0;

  private connectionCountThisMinute = 0;

  private disconnectionCountThisMinute = 0;

  private dbAvailable = true;

  constructor() {
    setInterval(() => this.captureMinuteMetric(), 60000);
    setInterval(() => this.captureIntervalMetric(), 15 * 60000);
  }

  setDbAvailable(available: boolean): void {
    if (available !== this.dbAvailable) {
      const status = available ? '✅' : '❌';
      console.log(`${simpleLog()} ${status} BD: ${available ? 'disponible' : 'no disponible'}`);
      this.dbAvailable = available;
    }
  }

  recordListenerStart(
    listenerId: string,
    ipAddress: string,
    deviceType?: string,
    listenerCount?: number
  ): void {
    this.sessions.set(listenerId, {
      id: listenerId,
      ipAddress,
      deviceType,
      startTime: Date.now(),
      bytesReceived: 0,
    });

    this.connectionCountThisMinute++;
    this.connectionsThisInterval++;

    const countSuffix = listenerCount !== undefined ? ` - [${listenerCount} Oyentes]` : '';
    console.log(`${simpleLog()} 👂 Oyente conectado: ${listenerId} (${ipAddress})${countSuffix}`);
  }

  recordListenerEnd(listenerId: string, listenerCount?: number): void {
    const session = this.sessions.get(listenerId);

    if (!session) return;

    session.endTime = Date.now();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);

    this.disconnectionCountThisMinute++;

    const countSuffix = listenerCount !== undefined ? ` - [${listenerCount} Oyentes]` : '';
    console.log(
      `${simpleLog()} 👤 Oyente desconectado: ${listenerId} (${session.duration}s)${countSuffix}`
    );

    if (this.dbAvailable) {
      this.saveSessionToDB(session);
    }

    this.sessions.delete(listenerId);
  }

  recordListenerDrop(listenerId: string, listenerCount?: number): void {
    const session = this.sessions.get(listenerId);

    if (!session) return;

    session.endTime = Date.now();
    session.duration = Math.round((session.endTime - session.startTime) / 1000);
    session.isDropped = true;

    this.disconnectionCountThisMinute++;
    this.droppedThisInterval++;

    const countSuffix = listenerCount !== undefined ? ` - [${listenerCount} Oyentes]` : '';
    console.log(
      `${simpleLog()} ⚠️  Oyente desconectado abruptamente: ${listenerId}${countSuffix}`
    );

    if (this.dbAvailable) {
      this.saveSessionToDB(session);
    }

    this.sessions.delete(listenerId);
  }

  recordConnectionError(listenerId: string): void {
    this.errorsThisInterval++;

    console.log(`${simpleLog()} ❌ Error de conexión: ${listenerId}`);
  }

  updateBytesReceived(listenerId: string, bytes: number): void {
    const session = this.sessions.get(listenerId);

    if (session) {
      session.bytesReceived = bytes;
    }
  }

  private async saveSessionToDB(session: ListenerSession): Promise<void> {
    if (!this.dbAvailable) return;

    try {
      await turso.execute({
        sql: `
          INSERT INTO listener_sessions 
          (id, ip_address, device_type, start_time, end_time, duration_seconds, bytes_received)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          session.id,
          session.ipAddress,
          session.deviceType || 'unknown',
          session.startTime,
          session.endTime || 0,
          session.duration || 0,
          session.bytesReceived,
        ],
      });
    } catch (error) {

      this.dbAvailable = false;
      console.warn(
        `${simpleLog()} ⚠️  No se pudo guardar sesión: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }
  }

  private async captureMinuteMetric(): Promise<void> {
    const metric: MinuteMetric = {
      timestamp: new Date(),
      activeListeners: this.sessions.size,
      newConnections: this.connectionCountThisMinute,
      disconnections: this.disconnectionCountThisMinute,
    };

    this.minuteMetrics.push(metric);

    if (!this.dbAvailable) {
      this.connectionCountThisMinute = 0;
      this.disconnectionCountThisMinute = 0;
      return;
    }

    try {
      await turso.execute({
        sql: `
          INSERT INTO minute_metrics 
          (id, timestamp, active_listeners, new_connections, disconnections)
          VALUES (?, ?, ?, ?, ?)
        `,
        args: [
          uuidv4(),
          metric.timestamp.toISOString(),
          metric.activeListeners,
          metric.newConnections,
          metric.disconnections,
        ],
      });
    } catch (error) {
      this.dbAvailable = false;
      console.warn(
        `${simpleLog()} ⚠️  No se pudo guardar métrica de minuto: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }

    this.connectionCountThisMinute = 0;
    this.disconnectionCountThisMinute = 0;
  }

  private async captureIntervalMetric(): Promise<void> {
    const dropRatePercentage =
      this.connectionsThisInterval > 0
        ? (this.droppedThisInterval / this.connectionsThisInterval) * 100
        : 0;

    const errorRatePercentage =
      this.connectionsThisInterval > 0
        ? (this.errorsThisInterval / this.connectionsThisInterval) * 100
        : 0;

    const metric: IntervalMetric = {
      timestamp: new Date(),
      totalConnections: this.connectionsThisInterval,
      droppedConnections: this.droppedThisInterval,
      connectionErrors: this.errorsThisInterval,
      dropRatePercentage: Math.round(dropRatePercentage * 100) / 100,
      errorRatePercentage: Math.round(errorRatePercentage * 100) / 100,
    };

    if (!this.dbAvailable) {
      this.connectionsThisInterval = 0;
      this.droppedThisInterval = 0;
      this.errorsThisInterval = 0;
      return;
    }

    try {
      await turso.execute({
        sql: `
          INSERT INTO interval_metrics
          (id, timestamp, interval_minutes, total_connections, dropped_connections, connection_errors, drop_rate_percentage, error_rate_percentage)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          uuidv4(),
          metric.timestamp.toISOString(),
          15,
          metric.totalConnections,
          metric.droppedConnections,
          metric.connectionErrors,
          metric.dropRatePercentage,
          metric.errorRatePercentage,
        ],
      });

      console.log(
        `${simpleLog()} 📊 Métrica 15min: drop=${metric.dropRatePercentage}%, error=${metric.errorRatePercentage}%`
      );
    } catch (error) {
      this.dbAvailable = false;
      console.warn(
        `${simpleLog()} ⚠️  No se pudo guardar métrica de intervalo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      );
    }

    this.connectionsThisInterval = 0;
    this.droppedThisInterval = 0;
    this.errorsThisInterval = 0;
  }

  async getUniqueListenersByHour(hours: number = 24): Promise<any[]> {
    if (!this.dbAvailable) {
      console.warn(`${simpleLog()} ⚠️  BD no disponible, no se pueden obtener datos`);
      return [];
    }

    try {
      const result = await turso.execute(`
        SELECT 
          DATE(datetime(start_time / 1000, 'unixepoch')) as day,
          strftime('%H', datetime(start_time / 1000, 'unixepoch')) as hour,
          COUNT(DISTINCT ip_address) as unique_listeners,
          COUNT(*) as total_sessions,
          ROUND(AVG(duration_seconds), 2) as avg_duration
        FROM listener_sessions
        WHERE start_time > datetime('now', '-${hours} hours')
        GROUP BY day, hour
        ORDER BY day DESC, hour DESC
      `);

      return result.rows;
    } catch (error) {
      this.dbAvailable = false;
      console.warn(`${simpleLog()} ⚠️  Error obteniendo oyentes únicos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return [];
    }
  }

  async getUniqueListenersSummary(minutes: number = 60): Promise<any[]> {
    if (!this.dbAvailable) {
      console.warn(`${simpleLog()} ⚠️  BD no disponible, no se pueden obtener datos`);
      return [];
    }

    try {
      const result = await turso.execute(`
        SELECT
          COUNT(DISTINCT ip_address) as unique_listeners,
          COUNT(*) as total_sessions,
          ROUND(AVG(duration_seconds), 2) as avg_duration
        FROM listener_sessions
        WHERE start_time > (strftime('%s', 'now', '-${minutes} minutes') * 1000)
      `);

      return result.rows;
    } catch (error) {
      this.dbAvailable = false;
      console.warn(`${simpleLog()} ⚠️  Error obteniendo resumen de oyentes: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return [];
    }
  }

  async getLiveStats(): Promise<any> {
    if (!this.dbAvailable) {
      return {
        currentActiveListeners: this.sessions.size,
        last24Hours: {
          totalSessions: 0,
          uniqueListeners: 0,
          avgDuration: 0,
          maxDuration: 0,
          avgDropRate: 0,
        },
        dbStatus: 'unavailable',
      };
    }

    try {
      const sessionsResult = await turso.execute(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(DISTINCT ip_address) as unique_listeners,
          ROUND(AVG(duration_seconds), 2) as avg_duration,
          MAX(duration_seconds) as max_duration
        FROM listener_sessions
        WHERE start_time > datetime('now', '-24 hours')
      `);

      const dropRateResult = await turso.execute(`
        SELECT 
          ROUND(AVG(drop_rate_percentage), 2) as avg_drop_rate
        FROM interval_metrics
        WHERE timestamp > datetime('now', '-24 hours')
      `);

      return {
        currentActiveListeners: this.sessions.size,
        last24Hours: {
          totalSessions: sessionsResult.rows[0]?.total_sessions || 0,
          uniqueListeners: sessionsResult.rows[0]?.unique_listeners || 0,
          avgDuration: sessionsResult.rows[0]?.avg_duration || 0,
          maxDuration: sessionsResult.rows[0]?.max_duration || 0,
          avgDropRate: dropRateResult.rows[0]?.avg_drop_rate || 0,
        },
        dbStatus: 'available',
      };
    } catch (error) {
      this.dbAvailable = false;
      console.warn(`${simpleLog()} ⚠️  Error obteniendo stats: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return {
        currentActiveListeners: this.sessions.size,
        last24Hours: {
          totalSessions: 0,
          uniqueListeners: 0,
          avgDuration: 0,
          maxDuration: 0,
          avgDropRate: 0,
        },
        dbStatus: 'unavailable',
      };
    }
  }

  async getIntervalMetrics(minutes: number = 24 * 60): Promise<any[]> {
    if (!this.dbAvailable) {
      console.warn(`${simpleLog()} ⚠️  BD no disponible, no se pueden obtener datos`);
      return [];
    }

    try {
      const result = await turso.execute(`
        SELECT 
          timestamp,
          total_connections,
          dropped_connections,
          connection_errors,
          drop_rate_percentage,
          error_rate_percentage
        FROM interval_metrics
        WHERE timestamp > datetime('now', '-${minutes} minutes')
        ORDER BY timestamp DESC
      `);

      return result.rows;
    } catch (error) {
      this.dbAvailable = false;
      console.warn(`${simpleLog()} ⚠️  Error obteniendo métricas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return [];
    }
  }

  async getMinuteMetrics(minutes: number = 60): Promise<any[]> {
    if (!this.dbAvailable) {
      console.warn(`${simpleLog()} ⚠️  BD no disponible, no se pueden obtener datos`);
      return [];
    }

    try {
      const result = await turso.execute(`
        SELECT 
          timestamp,
          active_listeners,
          new_connections,
          disconnections
        FROM minute_metrics
        WHERE datetime(timestamp) > datetime('now', '-${minutes} minutes')
        ORDER BY datetime(timestamp) ASC
      `);

      return result.rows;
    } catch (error) {
      this.dbAvailable = false;
      console.warn(`${simpleLog()} ⚠️  Error obteniendo métricas por minuto: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return [];
    }
  }
}

export default new AnalyticsService();