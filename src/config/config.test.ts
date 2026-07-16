import { describe, it, expect, vi, beforeEach } from 'vitest';

// Prevent dotenv from loading .env so we control env vars in each test
vi.mock('dotenv', () => ({ config: vi.fn() }));

// Mock broadcaster (services/index) so config.ts can be imported in isolation
vi.mock('../services/index.js', () => ({
  default: {
    getStreamInfo: vi.fn().mockReturnValue({
      stationTitle: 'Test Radio',
      stationSubTitle: 'Live',
      stationDescription: 'A test station',
    }),
  },
}));

describe('config', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clean env vars that config reads
    delete process.env.PORT;
    delete process.env.HOST;
    delete process.env.PUBLIC_URL;
    delete process.env.PUBLISH_TOKEN;
  });

  it('uses default port 8000 when PORT is not set', async () => {
    const { default: config } = await import('./config.js');
    expect(config.http.port).toBe(8000);
  });

  it('reads port from PORT env var', async () => {
    process.env.PORT = '3000';
    const { default: config } = await import('./config.js');
    expect(config.http.port).toBe(3000);
  });

  it('uses default host 0.0.0.0 when HOST is not set', async () => {
    const { default: config } = await import('./config.js');
    expect(config.http.host).toBe('0.0.0.0');
  });

  it('reads host from HOST env var', async () => {
    process.env.HOST = '127.0.0.1';
    const { default: config } = await import('./config.js');
    expect(config.http.host).toBe('127.0.0.1');
  });

  it('uses empty string for publicUrl when PUBLIC_URL is not set', async () => {
    const { default: config } = await import('./config.js');
    expect(config.http.publicUrl).toBe('');
  });

  it('reads publicUrl from PUBLIC_URL env var', async () => {
    process.env.PUBLIC_URL = 'https://radio.example.com';
    const { default: config } = await import('./config.js');
    expect(config.http.publicUrl).toBe('https://radio.example.com');
  });

  it('uses empty string for publishToken when PUBLISH_TOKEN is not set', async () => {
    const { default: config } = await import('./config.js');
    expect(config.publishToken).toBe('');
  });

  it('reads publishToken from PUBLISH_TOKEN env var', async () => {
    process.env.PUBLISH_TOKEN = 'my-secret';
    const { default: config } = await import('./config.js');
    expect(config.publishToken).toBe('my-secret');
  });

  it('exposes stream path /audio', async () => {
    const { default: config } = await import('./config.js');
    expect(config.stream.path).toBe('/audio');
  });

  it('exposes ui config from broadcaster.getStreamInfo()', async () => {
    const { default: config } = await import('./config.js');
    // Fallback values are used when broadcaster returns empty strings; here
    // the mock returns real values so we just check the keys exist.
    expect(config.ui).toHaveProperty('stationTitle');
    expect(config.ui).toHaveProperty('stationSubTitle');
    expect(config.ui).toHaveProperty('stationDescription');
  });

  it('falls back to default stationTitle when broadcaster returns empty string', async () => {
    const broadcaster = (await import('../services/index.js')).default;
    vi.mocked(broadcaster.getStreamInfo).mockReturnValueOnce({
      stationTitle: '',
      stationSubTitle: '',
      stationDescription: '',
    });
    const { default: config } = await import('./config.js');
    expect(config.ui.stationTitle).toBe('JxLiveStream');
  });
});
