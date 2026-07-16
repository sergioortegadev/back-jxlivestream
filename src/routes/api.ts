import { Router } from 'express';
import config from '../config/config.js';
import broadcaster from '../services/index.js';
import analytics from '../services/analytics.js';

const router = Router();

router.get('/stats/live', async (_req, res) => {
  const stats = await analytics.getLiveStats();
  res.json(stats);
});

router.get('/stats/unique-by-hour', async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const data = await analytics.getUniqueListenersByHour(hours);
  res.json(data);
});

router.get('/stats/unique-summary', async (req, res) => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const data = await analytics.getUniqueListenersSummary(minutes);
  res.json(data);
});

router.get('/stats/interval-metrics', async (req, res) => {
  const minutesQuery = parseInt(req.query.minutes as string);
  const hoursQuery = parseInt(req.query.hours as string);
  const minutes = Number.isFinite(minutesQuery) && minutesQuery > 0
    ? minutesQuery
    : (Number.isFinite(hoursQuery) && hoursQuery > 0 ? hoursQuery * 60 : 24 * 60);

  const data = await analytics.getIntervalMetrics(minutes);
  res.json(data);
});

router.get('/stats/minute-metrics', async (req, res) => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const data = await analytics.getMinuteMetrics(minutes);
  res.json(data);
});

router.get('/stream-url', (req, res) => {
  const base = config.http.publicUrl || `${req.protocol}://${req.get('host')}`;
  res.json({
    url: `${base}/audio`,
  });
});

router.get('/ui-config', (_req, res) => {
  const { stationTitle, stationSubTitle, stationDescription } = broadcaster.getStreamInfo();

  res.json({
    stationTitle: stationTitle || config.ui.stationTitle,
    stationSubTitle: stationSubTitle || config.ui.stationSubTitle,
    stationDescription: stationDescription || config.ui.stationDescription,
  });
});

export default router;
