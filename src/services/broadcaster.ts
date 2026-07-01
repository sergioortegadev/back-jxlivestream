import { Response } from 'express';

export interface BroadcasterStats {
    listeners: number;
    bufferedChunks: number;
}

export default class Broadcaster {
    private readonly listeners = new Set<Response>();

    private readonly history: (Buffer | undefined)[];

    private writeIndex = 0;

    private buffered = 0

    constructor(private readonly historySize = 10) {
        this.history = new Array(historySize);
    }

    /*
     * Publica un nuevo chunck de audio
     */
    publish(chunk: Buffer): void {
        // guarda en bufer circular
        this.history[this.writeIndex] = chunk;

        this.writeIndex = (this.writeIndex + 1) % this.historySize;

        if (this.buffered < this.historySize) {
            this.buffered++ 
        }

        // enviar a todos (difundir)
        for (const listener of this.listeners) {
            try {
                listener.write(chunk);
            } catch (error) {
                this.listeners.delete(listener) // elimina sockets 'muertos'
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
     * Elimina oyente
     */
    unsubscribe(res: Response): void {
        this.listeners.delete(res);
    }

    /*
     * Envia el historial en orden cronologico
     */
    private sendHistory(res: Response): void {
        if (this.buffered === 0) return

        // si el buffer no está lleno
        if (this.buffered < this.historySize) {
            for (let i = 0; i < this.buffered; i++) {
                const chunk = this.history[i];
                if (chunk) res.write(chunk);
            }
            return;
        }

        // buffer lleno: comenzar desde el más antiguo
        for (let i = 0; i < this.historySize; i++) {
            const index = (this.writeIndex + i) % this.historySize;

            const chunk = this.history[index];

            if (chunk) res.write(chunk);
        }
    }

    getStats(): BroadcasterStats {
        return {
            listeners: this.listeners.size,
            bufferedChunks: this.buffered,
        };
    }

    clear(): void {
        this.listeners.clear();

        this.history.fill(undefined);

        this.writeIndex = 0;

        this.buffered = 0;
    }
}