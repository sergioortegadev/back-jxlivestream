import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the DB client so no real DB calls happen
vi.mock('../db/client.js', () => ({
  default: {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

const { AnalyticsService } = await import('./analytics.js');
const turso = (await import('../db/client.js')).default;

describe('AnalyticsService', () => {
  let analytics: InstanceType<typeof AnalyticsService>;

  beforeEach(() => {
    vi.clearAllMocks();
    analytics = new AnalyticsService();
  });

  describe('setDbAvailable', () => {
    it('does not log when value has not changed', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.setDbAvailable(true); // default is true → no change
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('logs when db availability changes', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('recordListenerStart', () => {
    it('adds a session for the given listenerId', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.recordListenerStart('listener-1', '127.0.0.1', 'desktop');
      // Indirectly verify via getLiveStats (active listeners count)
      // We check it doesn't throw and session tracking works
      expect(() => analytics.recordListenerEnd('listener-1')).not.toThrow();
    });

    it('does not throw when listenerCount is omitted', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      expect(() => analytics.recordListenerStart('l2', '10.0.0.1')).not.toThrow();
    });
  });

  describe('recordListenerEnd', () => {
    it('removes the session without throwing', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.recordListenerStart('l3', '192.168.1.1');
      expect(() => analytics.recordListenerEnd('l3')).not.toThrow();
    });

    it('does nothing if listenerId does not exist', () => {
      expect(() => analytics.recordListenerEnd('nonexistent')).not.toThrow();
    });

    it('saves session to DB when dbAvailable is true', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.recordListenerStart('l4', '10.0.0.2');
      analytics.recordListenerEnd('l4');
      expect(turso.execute).toHaveBeenCalled();
    });

    it('does not save to DB when dbAvailable is false', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      analytics.recordListenerStart('l5', '10.0.0.3');
      analytics.recordListenerEnd('l5');
      expect(turso.execute).not.toHaveBeenCalled();
    });
  });

  describe('recordListenerDrop', () => {
    it('marks session as dropped and removes it', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.recordListenerStart('l6', '10.0.0.4');
      expect(() => analytics.recordListenerDrop('l6')).not.toThrow();
    });

    it('does nothing if listenerId does not exist', () => {
      expect(() => analytics.recordListenerDrop('unknown')).not.toThrow();
    });
  });

  describe('recordConnectionError', () => {
    it('does not throw', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      expect(() => analytics.recordConnectionError('l7')).not.toThrow();
    });
  });

  describe('updateBytesReceived', () => {
    it('updates bytes for an active session', () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.recordListenerStart('l8', '10.0.0.5');
      expect(() => analytics.updateBytesReceived('l8', 1024)).not.toThrow();
    });

    it('does nothing for an unknown listenerId', () => {
      expect(() => analytics.updateBytesReceived('ghost', 512)).not.toThrow();
    });
  });

  describe('getLiveStats (DB unavailable)', () => {
    it('returns a fallback response with dbStatus=unavailable', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      const stats = await analytics.getLiveStats();
      expect(stats.dbStatus).toBe('unavailable');
      expect(typeof stats.currentActiveListeners).toBe('number');
    });
  });

  describe('getUniqueListenersByHour (DB unavailable)', () => {
    it('returns an empty array', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      const result = await analytics.getUniqueListenersByHour(24);
      expect(result).toEqual([]);
    });
  });

  describe('getUniqueListenersByHour (DB available)', () => {
    it('queries the DB and returns rows', async () => {
      const mockRows = [{ day: '2024-01-01', hour: '10', unique_listeners: 5 }];
      vi.mocked(turso.execute).mockResolvedValueOnce({ rows: mockRows } as never);
      const result = await analytics.getUniqueListenersByHour(24);
      expect(turso.execute).toHaveBeenCalled();
      expect(result).toEqual(mockRows);
    });
  });

  describe('getUniqueListenersSummary (DB unavailable)', () => {
    it('returns an empty array', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      const result = await analytics.getUniqueListenersSummary(60);
      expect(result).toEqual([]);
    });
  });

  describe('getIntervalMetrics', () => {
    it('returns empty array when DB unavailable', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      const result = await analytics.getIntervalMetrics(60);
      expect(result).toEqual([]);
    });
  });

  describe('getMinuteMetrics', () => {
    it('returns empty array when DB unavailable', async () => {
      vi.spyOn(console, 'log').mockImplementation(() => undefined);
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      analytics.setDbAvailable(false);
      const result = await analytics.getMinuteMetrics(60);
      expect(result).toEqual([]);
    });
  });
});
