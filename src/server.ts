/* eslint-disable no-console */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import publishRoute from './routes/publish.js';
import audioRoute from './routes/audio.js';
import healthRoute from './routes/health.js';
import { simpleLog } from './helpers/helpers.js';
import { initializeDatabase } from './db/schema.js';
import analytics from './services/analytics.js';

const app = express();
app.use(cors());

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

app.use('/publish', publishRoute);
app.use('/audio', audioRoute);

app.get('/api/stats/live', async (req, res) => {
  const stats = await analytics.getLiveStats();
  res.json(stats);
});

app.get('/api/stats/unique-by-hour', async (req, res) => {
  const hours = parseInt(req.query.hours as string) || 24;
  const data = await analytics.getUniqueListenersByHour(hours);
  res.json(data);
});

app.get('/api/stats/unique-summary', async (req, res) => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const data = await analytics.getUniqueListenersSummary(minutes);
  res.json(data);
});

app.get('/api/stats/interval-metrics', async (req, res) => {
  const minutesQuery = parseInt(req.query.minutes as string);
  const hoursQuery = parseInt(req.query.hours as string);
  const minutes = Number.isFinite(minutesQuery) && minutesQuery > 0
    ? minutesQuery
    : (Number.isFinite(hoursQuery) && hoursQuery > 0 ? hoursQuery * 60 : 24 * 60);

  const data = await analytics.getIntervalMetrics(minutes);
  res.json(data);
});

app.get('/api/stats/minute-metrics', async (req, res) => {
  const minutes = parseInt(req.query.minutes as string) || 60;
  const data = await analytics.getMinuteMetrics(minutes);
  res.json(data);
});

app.get('/api/stream-url', (req, res) => {
  const base = config.http.publicUrl || `${req.protocol}://${req.get('host')}`;
  res.json({
    url: `${base}/audio`,
  });
});

app.get('/api/ui-config', (_req, res) => {
  res.json({
    stationTitle: config.ui.stationTitle,
  });
});

app.use('/health', healthRoute);

const server = app.listen(config.http.port, config.http.host, async () => {
  const base = config.http.publicUrl || `http://${config.http.host}:${config.http.port}`;

  console.log(`\n -------------------------------------------------------------------------`);
  console.log(`                      📻  JxLiveStream running ok`);
  console.log(` -------------------------------------------------------------------------`);

  const dbInitialized = await initializeDatabase();
  analytics.setDbAvailable(dbInitialized);

  console.log(`\n   ⤷ 🔴 (push from OBS) -> sender -> POST ${base}/publish`);
  console.log(`\n   🌐 Web (test): ${base}`);
  console.log(`\n   📊 Estadisticas (Dashboard): ${base}/stats.html`);
  console.log(`\n   🎧 GET - ${base}/audio`);
  console.log(`\n   📊 Stats live (endpoint) - ${base}/api/stats/live`);
  console.log(`\n   📈 Unique listeners (endpoint) - ${base}/api/stats/unique-by-hour`);
  console.log(`\n   ⚠️  Drop rate (endpoint) - ${base}/api/stats/interval-metrics`);
  console.log(`\n   ❤️  ${base}/health`);
  console.log(`\n\n    ${simpleLog()} System started \n`);
  console.log(` -------------------------------------------------------------------------\n`);
});

server.requestTimeout = 0;
server.keepAliveTimeout = 0;
server.timeout = 0;

process.on('SIGINT', () => {
  console.log(`\n   ${simpleLog()}  ✳️  Shutting down...`);
  process.exit(0);
});