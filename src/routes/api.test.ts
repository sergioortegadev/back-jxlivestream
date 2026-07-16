import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAnalytics = {
  getLiveStats: vi.fn().mockResolvedValue({ currentActiveListeners: 2 }),
  getUniqueListenersByHour: vi.fn().mockResolvedValue([]),
  getUniqueListenersSummary: vi.fn().mockResolvedValue([]),
  getIntervalMetrics: vi.fn().mockResolvedValue([]),
  getMinuteMetrics: vi.fn().mockResolvedValue([]),
};

vi.mock('../services/analytics.js', () => ({ default: mockAnalytics }));

vi.mock('../services/index.js', () => ({
  default: {
    getStreamInfo: vi.fn().mockReturnValue({
      stationTitle: 'My Radio',
      stationSubTitle: 'Live 24/7',
      stationDescription: 'Cool station',
    }),
    getStats: vi.fn().mockReturnValue({}),
    subscribe: vi.fn(),
  },
}));

vi.mock('../config/config.js', () => ({
  default: {
    http: { port: 8000, host: '0.0.0.0', publicUrl: 'https://radio.test' },
    ui: {
      stationTitle: 'Default Title',
      stationSubTitle: 'Default Sub',
      stationDescription: 'Default Desc',
    },
    stream: { path: '/audio' },
    publishToken: 'test-token',
  },
}));

// ── App setup ────────────────────────────────────────────────────────────────

const { default: apiRoute } = await import('./api.js');

const app = express();
app.use('/', apiRoute);

// ─────────────────────────────────────────────────────────────────────────────

describe('GET /stats/live', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/stats/live');
    expect(res.status).toBe(200);
  });

  it('calls analytics.getLiveStats()', async () => {
    await request(app).get('/stats/live');
    expect(mockAnalytics.getLiveStats).toHaveBeenCalledOnce();
  });

  it('returns the stats JSON', async () => {
    const res = await request(app).get('/stats/live');
    expect(res.body).toMatchObject({ currentActiveListeners: 2 });
  });
});

describe('GET /stats/unique-by-hour', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/stats/unique-by-hour');
    expect(res.status).toBe(200);
  });

  it('defaults to 24 hours', async () => {
    await request(app).get('/stats/unique-by-hour');
    expect(mockAnalytics.getUniqueListenersByHour).toHaveBeenCalledWith(24);
  });

  it('passes ?hours query param', async () => {
    await request(app).get('/stats/unique-by-hour?hours=48');
    expect(mockAnalytics.getUniqueListenersByHour).toHaveBeenCalledWith(48);
  });
});

describe('GET /stats/unique-summary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/stats/unique-summary');
    expect(res.status).toBe(200);
  });

  it('defaults to 60 minutes', async () => {
    await request(app).get('/stats/unique-summary');
    expect(mockAnalytics.getUniqueListenersSummary).toHaveBeenCalledWith(60);
  });

  it('passes ?minutes query param', async () => {
    await request(app).get('/stats/unique-summary?minutes=30');
    expect(mockAnalytics.getUniqueListenersSummary).toHaveBeenCalledWith(30);
  });
});

describe('GET /stats/interval-metrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/stats/interval-metrics');
    expect(res.status).toBe(200);
  });

  it('defaults to 24*60 minutes when no query param given', async () => {
    await request(app).get('/stats/interval-metrics');
    expect(mockAnalytics.getIntervalMetrics).toHaveBeenCalledWith(24 * 60);
  });

  it('uses ?minutes param when provided', async () => {
    await request(app).get('/stats/interval-metrics?minutes=30');
    expect(mockAnalytics.getIntervalMetrics).toHaveBeenCalledWith(30);
  });

  it('converts ?hours param to minutes', async () => {
    await request(app).get('/stats/interval-metrics?hours=2');
    expect(mockAnalytics.getIntervalMetrics).toHaveBeenCalledWith(120);
  });

  it('ignores non-positive minutes and falls back to default', async () => {
    await request(app).get('/stats/interval-metrics?minutes=0');
    expect(mockAnalytics.getIntervalMetrics).toHaveBeenCalledWith(24 * 60);
  });
});

describe('GET /stats/minute-metrics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns HTTP 200', async () => {
    const res = await request(app).get('/stats/minute-metrics');
    expect(res.status).toBe(200);
  });

  it('defaults to 60 minutes', async () => {
    await request(app).get('/stats/minute-metrics');
    expect(mockAnalytics.getMinuteMetrics).toHaveBeenCalledWith(60);
  });

  it('passes ?minutes query param', async () => {
    await request(app).get('/stats/minute-metrics?minutes=15');
    expect(mockAnalytics.getMinuteMetrics).toHaveBeenCalledWith(15);
  });
});

describe('GET /stream-url', () => {
  it('returns the audio stream URL using publicUrl from config', async () => {
    const res = await request(app).get('/stream-url');
    expect(res.status).toBe(200);
    expect(res.body.url).toBe('https://radio.test/audio');
  });
});

describe('GET /ui-config', () => {
  it('returns HTTP 200', async () => {
    const res = await request(app).get('/ui-config');
    expect(res.status).toBe(200);
  });

  it('returns station info from broadcaster.getStreamInfo()', async () => {
    const res = await request(app).get('/ui-config');
    expect(res.body.stationTitle).toBe('My Radio');
    expect(res.body.stationSubTitle).toBe('Live 24/7');
    expect(res.body.stationDescription).toBe('Cool station');
  });

  it('falls back to config ui values when broadcaster returns empty strings', async () => {
    const broadcaster = (await import('../services/index.js')).default;
    vi.mocked(broadcaster.getStreamInfo).mockReturnValueOnce({
      stationTitle: '',
      stationSubTitle: '',
      stationDescription: '',
    });

    const res = await request(app).get('/ui-config');
    expect(res.body.stationTitle).toBe('Default Title');
    expect(res.body.stationSubTitle).toBe('Default Sub');
    expect(res.body.stationDescription).toBe('Default Desc');
  });
});
