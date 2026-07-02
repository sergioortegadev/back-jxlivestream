import { Response } from 'express';

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

  constructor(private readonly historySize = 10) {
    this.history = new Array(historySize);
  }

  /*
   * Indica que un emisor comenzó a transmitir
   */
  publisherStarted(): void {
    this.publisherConnected = true;
    this.startedAt = Date.now();
    this.bytesReceived = 0;
  }

  /*
   * Indica que el emisor finalizó la transmisión
   */
  publisherStopped(): void {
    this.publisherConnected = false;
  }

  /*
   * Publica un nuevo chunk de audio
   */
  publish(chunk: Buffer): void {
    this.bytesReceived += chunk.length;

    // Guarda en buffer circular
    this.history[this.writeIndex] = chunk;

    this.writeIndex = (this.writeIndex + 1) % this.historySize;

    if (this.buffered < this.historySize) {
      this.buffered++;
    }

    // Difundir a todos los oyentes
    for (const listener of this.listeners) {
      try {
        listener.write(chunk);
      } catch {
        this.listeners.delete(listener);
      }
    }
  }

  /*
   * Agrega un nuevo oyente
   */
  subscribe(res: Response): void {
    this.sendHistory(res);

    this.listeners.add(res);
  }

  /*
   * Elimina un oyente
   */
  unsubscribe(res: Response): void {
    this.listeners.delete(res);
  }

  /*
   * Envía el historial en orden cronológico
   */
  private sendHistory(res: Response): void {
    if (this.buffered === 0) return;

    // Si el buffer aún no está lleno
    if (this.buffered < this.historySize) {
      for (let i = 0; i < this.buffered; i++) {
        const chunk = this.history[i];

        if (chunk) {
          res.write(chunk);
        }
      }

      return;
    }

    // Buffer lleno
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
