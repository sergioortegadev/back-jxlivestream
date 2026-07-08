/* eslint-disable @typescript-eslint/no-explicit-any */
import { Response } from 'express';
import analytics from './analytics.js';

export interface BroadcasterStats {
  listeners: number;
  bufferedChunks: number;
  publisherConnected: boolean;
  bytesReceived: number;
  bitrateKbps: number;
}

export default class Broadcaster {
  private readonly listeners = new Set<Response>();

  private readonly history: (Buffer | undefined)[];

  private writeIndex = 0;

  private buffered = 0;

  private publisherConnected = false;

  private bytesReceived = 0;

  private startedAt = Date.now();

  private _stationTitle = '';

  private _stationMessage = '';

  constructor(private readonly historySize = 10) {
    this.history = new Array(historySize);
  }

  publisherStarted(): void {
    this.publisherConnected = true;
    this.startedAt = Date.now();
    this.bytesReceived = 0;
  }

  setStreamInfo(title: string, message: string): void {
    this._stationTitle = title;
    this._stationMessage = message;
  }

  getStreamInfo(): { stationTitle: string; stationMessage: string } {
    return { stationTitle: this._stationTitle, stationMessage: this._stationMessage };
  }

  publisherStopped(): void {
    this.publisherConnected = false;
  }

  publish(chunk: Buffer): void {
    this.bytesReceived += chunk.length;

    this.history[this.writeIndex] = chunk;
    this.writeIndex = (this.writeIndex + 1) % this.historySize;

    if (this.buffered < this.historySize) {
      this.buffered++;
    }

    // Difundir a todos los oyentes
    for (const listener of this.listeners) {
      try {
        listener.write(chunk);
      } catch (error) {
        // ✅ NUEVO: Registrar error de conexión
        const listenerId = (listener as any).listenerId;
        this.listeners.delete(listener);
        if (listenerId) {
          analytics.recordConnectionError(listenerId);
          analytics.recordListenerDrop(listenerId, this.listeners.size);
        }
      }
    }
  }

  /**
   * ✅ MODIFICADO: Agrega id y dispositivo
   */
  subscribe(res: Response, listenerId: string, ipAddress: string, deviceType?: string): void {
    this.sendHistory(res);

    // ✅ Guardar metadata en la response
    (res as any).listenerId = listenerId;
    (res as any).startTime = Date.now();

    this.listeners.add(res);

    // ✅ NUEVO: Registrar inicio de sesión (después de añadir al set para reflejar conteo real)
    analytics.recordListenerStart(listenerId, ipAddress, deviceType, this.listeners.size);

    // ✅ NUEVO: Actualizar bytes cuando se cierre
    res.on('close', () => {
      analytics.updateBytesReceived(listenerId, this.bytesReceived);
      this.unsubscribe(res);
      analytics.recordListenerEnd(listenerId, this.listeners.size);
    });

    res.on('error', () => {
      this.unsubscribe(res);
      analytics.recordListenerDrop(listenerId, this.listeners.size);
    });
  }

  unsubscribe(res: Response): void {
    this.listeners.delete(res);
  }

  private sendHistory(res: Response): void {
    if (this.buffered === 0) return;

    if (this.buffered < this.historySize) {
      for (let i = 0; i < this.buffered; i++) {
        const chunk = this.history[i];
        if (chunk) {
          res.write(chunk);
        }
      }
      return;
    }

    for (let i = 0; i < this.historySize; i++) {
      const index = (this.writeIndex + i) % this.historySize;
      const chunk = this.history[index];
      if (chunk) {
        res.write(chunk);
      }
    }
  }

  getStats(): BroadcasterStats {
    const elapsedSeconds = Math.max((Date.now() - this.startedAt) / 1000, 1);
    const bitrateKbps = Math.round((this.bytesReceived * 8) / elapsedSeconds / 1000);

    return {
      listeners: this.listeners.size,
      bufferedChunks: this.buffered,
      publisherConnected: this.publisherConnected,
      bytesReceived: this.bytesReceived,
      bitrateKbps,
    };
  }

  clear(): void {
    this.listeners.clear();
    this.history.fill(undefined);
    this.writeIndex = 0;
    this.buffered = 0;
    this.publisherConnected = false;
    this.bytesReceived = 0;
    this.startedAt = Date.now();
  }
}