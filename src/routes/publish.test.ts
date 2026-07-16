import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBroadcaster = {
  setStreamInfo: vi.fn(),
  publisherStarted: vi.fn(),
  publisherStopped: vi.fn(),
  publish: vi.fn(),
  getStreamInfo: vi.fn().mockReturnValue({ stationTitle: '', stationSubTitle: '', stationDescription: '' }),
};

vi.mock('../services/index.js', () => ({ default: mockBroadcaster }));

vi.mock('../config/config.js', () => ({
  default: {
    http: { port: 8000, host: '0.0.0.0', publicUrl: '' },
    ui: { stationTitle: 'JxLiveStream', stationSubTitle: '', stationDescription: '' },
    stream: { path: '/audio' },
    publishToken: 'secret',
  },
}));

// ── App setup ────────────────────────────────────────────────────────────────

const { default: publishRoute } = await import('./publish.js');

const app = express();
app.use('/', publishRoute);

// ─────────────────────────────────────────────────────────────────────────────

describe('POST /publish (auth)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).post('/').send('data');
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is wrong', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', 'Bearer wrong')
      .send('data');
    expect(res.status).toBe(401);
  });
});

describe('POST /publish (valid token)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls broadcaster.publisherStarted() when a valid request is sent', async () => {
    await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .send(Buffer.from('audio'));
    expect(mockBroadcaster.publisherStarted).toHaveBeenCalledOnce();
  });

  it('calls broadcaster.setStreamInfo with headers values', async () => {
    await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .set('x-station-title', 'Radio Test')
      .set('x-station-subtitle', 'Sub Test')
      .set('x-station-description', 'Desc Test')
      .send(Buffer.from('audio'));
    expect(mockBroadcaster.setStreamInfo).toHaveBeenCalledWith(
      'Radio Test',
      'Sub Test',
      'Desc Test'
    );
  });

  it('sets empty strings for missing station headers', async () => {
    await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .send(Buffer.from('audio'));
    expect(mockBroadcaster.setStreamInfo).toHaveBeenCalledWith('', '', '');
  });

  it('calls broadcaster.publish for each data chunk', async () => {
    await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .send(Buffer.from('chunk'));
    expect(mockBroadcaster.publish).toHaveBeenCalled();
  });

  it('returns 200 when the request stream ends', async () => {
    const res = await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .send(Buffer.from('audio'));
    expect(res.status).toBe(200);
  });

  it('calls broadcaster.publisherStopped() after the stream ends', async () => {
    await request(app)
      .post('/')
      .set('Authorization', 'Bearer secret')
      .send(Buffer.from('audio'));
    expect(mockBroadcaster.publisherStopped).toHaveBeenCalledOnce();
  });
});
