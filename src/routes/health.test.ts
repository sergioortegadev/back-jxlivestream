import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../services/index.js', () => ({
  default: {
    getStats: vi.fn().mockReturnValue({
      listeners: 3,
      bufferedChunks: 5,
      publisherConnected: true,
      bytesReceived: 102400,
      bitrateKbps: 128,
    }),
    getStreamInfo: vi.fn().mockReturnValue({
      stationTitle: '',
      stationSubTitle: '',
      stationDescription: '',
    }),
    subscribe: vi.fn(),
  },
}));

const { default: healthRoute } = await import('./health.js');

const app = express();
app.use('/', healthRoute);

describe('GET /health', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
  });

  it('returns status: ok', async () => {
    const res = await request(app).get('/');
    expect(res.body.status).toBe('ok');
  });

  it('returns uptime as a non-negative number', async () => {
    const res = await request(app).get('/');
    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('includes broadcaster stats in the response', async () => {
    const res = await request(app).get('/');
    expect(res.body.listeners).toBe(3);
    expect(res.body.publisherConnected).toBe(true);
    expect(res.body.bytesReceived).toBe(102400);
    expect(res.body.bitrateKbps).toBe(128);
  });

  it('includes stream endpoint paths', async () => {
    const res = await request(app).get('/');
    expect(res.body.stream).toEqual({ publish: '/publish', audio: '/audio' });
  });

  it('returns JSON content type', async () => {
    const res = await request(app).get('/');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
