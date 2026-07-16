import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBroadcaster = {
  subscribe: vi.fn(),
  getStats: vi.fn().mockReturnValue({ listeners: 1 }),
  getStreamInfo: vi.fn().mockReturnValue({
    stationTitle: '',
    stationSubTitle: '',
    stationDescription: '',
  }),
};

vi.mock('../services/index.js', () => ({ default: mockBroadcaster }));

vi.mock('../config/config.js', () => ({
  default: {
    http: { port: 8000, host: '0.0.0.0', publicUrl: '' },
    ui: { stationTitle: 'JxLiveStream', stationSubTitle: '', stationDescription: '' },
    stream: { path: '/audio' },
    publishToken: 'test-token',
  },
}));

// ── App setup ────────────────────────────────────────────────────────────────

const { default: audioRoute } = await import('./audio.js');

const app = express();
app.use('/', audioRoute);

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /audio', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sets Content-Type to audio/mpeg', async () => {
    // subscribe is called synchronously; supertest keeps the connection open
    // until we close it. We intercept subscribe to end the response immediately.
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => {
      _res.end();
    });
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/audio\/mpeg/);
  });

  it('sets Cache-Control: no-cache', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    const res = await request(app).get('/');
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('sets icy-br header', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    const res = await request(app).get('/');
    expect(res.headers['icy-br']).toBe('128');
  });

  it('sets icy-metaint header to 0', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    const res = await request(app).get('/');
    expect(res.headers['icy-metaint']).toBe('0');
  });

  it('sets icy-pub header to 1', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    const res = await request(app).get('/');
    expect(res.headers['icy-pub']).toBe('1');
  });

  it('calls broadcaster.subscribe with a listenerId and ip', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    await request(app).get('/');
    expect(mockBroadcaster.subscribe).toHaveBeenCalledOnce();
    const [, listenerId, ip] = mockBroadcaster.subscribe.mock.calls[0];
    expect(typeof listenerId).toBe('string');
    expect(listenerId.length).toBeGreaterThan(0);
    expect(typeof ip).toBe('string');
  });

  it('passes ?device query param as deviceType to subscribe', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    await request(app).get('/?device=mobile');
    const [, , , deviceType] = mockBroadcaster.subscribe.mock.calls[0];
    expect(deviceType).toBe('mobile');
  });

  it('passes undefined deviceType when ?device is absent', async () => {
    mockBroadcaster.subscribe.mockImplementationOnce((_res: any) => _res.end());
    await request(app).get('/');
    const [, , , deviceType] = mockBroadcaster.subscribe.mock.calls[0];
    expect(deviceType).toBeUndefined();
  });
});
