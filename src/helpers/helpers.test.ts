import { describe, it, expect } from 'vitest';
import { messageLog, simpleLog } from './helpers.js';

describe('helpers', () => {
  describe('messageLog', () => {
    it('returns a string containing the message', () => {
      const result = messageLog('hello world');
      expect(result).toContain('hello world');
    });

    it('returns a string with time in HH:MM:SS format', () => {
      const result = messageLog('test');
      // Format: "  HH:MM:SS - test"
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    it('includes a dash separator between time and message', () => {
      const result = messageLog('my message');
      expect(result).toMatch(/\d{2}:\d{2}:\d{2} - my message/);
    });

    it('returns a string type', () => {
      const result = messageLog('test');
      expect(typeof result).toBe('string');
    });
  });

  describe('simpleLog', () => {
    it('returns a string type', () => {
      const result = simpleLog();
      expect(typeof result).toBe('string');
    });

    it('returns a string with time in HH:MM:SS format followed by a dash', () => {
      const result = simpleLog();
      expect(result).toMatch(/\d{2}:\d{2}:\d{2} - /);
    });

    it('accepts a custom timezone without throwing', () => {
      expect(() => simpleLog('UTC')).not.toThrow();
    });
  });
});
