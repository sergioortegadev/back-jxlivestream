import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Response } from 'express';

// Mock analytics so Broadcaster doesn't need the DB
vi.mock('./analytics.js', () => ({
  default: {
    recordListenerStart: vi.fn(),
    recordListenerEnd: vi.fn(),
    recordListenerDrop: vi.fn(),
    recordConnectionError: vi.fn(),
    updateBytesReceived: vi.fn(),
  },
}));

const { default: Broadcaster } = await import('./broadcaster.js');

function makeResponse(listenerId?: string) {
  const events: Record<string, (() => void)[]> = {};
  const res = {
    write: vi.fn(),
    on: vi.fn((event: string, cb: () => void) => {
      events[event] = events[event] ?? [];
      events[event].push(cb);
    }),
    listenerId,
    emit: (event: string) => events[event]?.forEach((cb) => cb()),
  };
  return res as unknown as Response & { emit: (e: string) => void };
}

describe('Broadcaster', () => {
  let broadcaster: InstanceType<typeof Broadcaster>;

  beforeEach(() => {
    broadcaster = new Broadcaster(5);
  });

  describe('initial state', () => {
    it('reports no listeners initially', () => {
      expect(broadcaster.getStats().listeners).toBe(0);
    });

    it('reports publisherConnected as false initially', () => {
      expect(broadcaster.getStats().publisherConnected).toBe(false);
    });

    it('reports zero bytesReceived initially', () => {
      expect(broadcaster.getStats().bytesReceived).toBe(0);
    });
  });

  describe('publisherStarted / publisherStopped', () => {
    it('sets publisherConnected to true on publisherStarted', () => {
      broadcaster.publisherStarted();
      expect(broadcaster.getStats().publisherConnected).toBe(true);
    });

    it('sets publisherConnected to false on publisherStopped', () => {
      broadcaster.publisherStarted();
      broadcaster.publisherStopped();
      expect(broadcaster.getStats().publisherConnected).toBe(false);
    });

    it('resets bytesReceived on publisherStarted', () => {
      broadcaster.publisherStarted();
      broadcaster.publish(Buffer.from('data'));
      broadcaster.publisherStarted();
      expect(broadcaster.getStats().bytesReceived).toBe(0);
    });
  });

  describe('stream info', () => {
    it('returns empty strings before setStreamInfo is called', () => {
      const info = broadcaster.getStreamInfo();
      expect(info.stationTitle).toBe('');
      expect(info.stationSubTitle).toBe('');
      expect(info.stationDescription).toBe('');
    });

    it('stores and retrieves stream info', () => {
      broadcaster.setStreamInfo('Radio Test', 'Live 24/7', 'A cool station');
      const info = broadcaster.getStreamInfo();
      expect(info.stationTitle).toBe('Radio Test');
      expect(info.stationSubTitle).toBe('Live 24/7');
      expect(info.stationDescription).toBe('A cool station');
    });

    it('allows overwriting stream info', () => {
      broadcaster.setStreamInfo('Old', 'Old Sub', 'Old desc');
      broadcaster.setStreamInfo('New', 'New Sub', 'New desc');
      expect(broadcaster.getStreamInfo().stationTitle).toBe('New');
    });
  });

  describe('publish', () => {
    it('accumulates bytesReceived', () => {
      broadcaster.publisherStarted();
      const chunk = Buffer.from('hello');
      broadcaster.publish(chunk);
      expect(broadcaster.getStats().bytesReceived).toBe(chunk.length);
    });

    it('sends chunk to all subscribed listeners', () => {
      const res1 = makeResponse('id-1');
      const res2 = makeResponse('id-2');

      broadcaster.subscribe(res1 as Response, 'id-1', '1.1.1.1');
      broadcaster.subscribe(res2 as Response, 'id-2', '2.2.2.2');

      const chunk = Buffer.from('audio-data');
      broadcaster.publish(chunk);

      expect(res1.write).toHaveBeenCalledWith(chunk);
      expect(res2.write).toHaveBeenCalledWith(chunk);
    });

    it('increments bufferedChunks up to historySize', () => {
      for (let i = 0; i < 10; i++) {
        broadcaster.publish(Buffer.from('x'));
      }
      // historySize is 5; buffered should not exceed it
      expect(broadcaster.getStats().bufferedChunks).toBe(5);
    });
  });

  describe('subscribe / unsubscribe', () => {
    it('increments listener count on subscribe', () => {
      const res = makeResponse('id-1');
      broadcaster.subscribe(res as Response, 'id-1', '1.1.1.1');
      expect(broadcaster.getStats().listeners).toBe(1);
    });

    it('decrements listener count on unsubscribe', () => {
      const res = makeResponse('id-1');
      broadcaster.subscribe(res as Response, 'id-1', '1.1.1.1');
      broadcaster.unsubscribe(res as Response);
      expect(broadcaster.getStats().listeners).toBe(0);
    });

    it('plays back history to a new subscriber', () => {
      const chunk = Buffer.from('history-data');
      broadcaster.publish(chunk);

      const res = makeResponse('id-late');
      broadcaster.subscribe(res as Response, 'id-late', '3.3.3.3');

      expect(res.write).toHaveBeenCalledWith(chunk);
    });
  });

  describe('getStats', () => {
    it('returns bitrateKbps as a number', () => {
      const stats = broadcaster.getStats();
      expect(typeof stats.bitrateKbps).toBe('number');
    });

    it('returns bufferedChunks as a number', () => {
      const stats = broadcaster.getStats();
      expect(typeof stats.bufferedChunks).toBe('number');
    });
  });

  describe('clear', () => {
    it('resets all state', () => {
      broadcaster.publisherStarted();
      broadcaster.publish(Buffer.from('data'));
      broadcaster.setStreamInfo('T', 'S', 'D');

      broadcaster.clear();

      const stats = broadcaster.getStats();
      expect(stats.publisherConnected).toBe(false);
      expect(stats.bytesReceived).toBe(0);
      expect(stats.bufferedChunks).toBe(0);
      expect(stats.listeners).toBe(0);
    });
  });
});
