/* eslint-disable no-console */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import publishRoute from './routes/publish.js';
import audioRoute from './routes/audio.js';
import apiRoute from './routes/api.js';
import healthRoute from './routes/health.js';
import broadcaster from './services/index.js';
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
app.use('/api', apiRoute);
app.use('/health', healthRoute);

const server = app.listen(config.http.port, config.http.host, async () => {
  const base = config.http.publicUrl || `http://${config.http.host}:${config.http.port}`;

  console.log(`\n -------------------------------------------------------------------------`);
  console.log(`                      📻  JxLiveStream running ok 🛜`);
  console.log(` -------------------------------------------------------------------------`);

  const dbInitialized = await initializeDatabase();
  analytics.setDbAvailable(dbInitialized);

  console.log(`\n   ⤷ (push from OBS) -> sender 🎤 -> POST ${base}/publish`);
  console.log(`\n   Web player: ${base}`);
  console.log(`\n   Web home: ${base}/home.html`);
  console.log(`\n   Web estadísticas (dashboard): ${base}/stats.html`);
  console.log(`\n   GET - ${base}/audio`);
  console.log(`\n   Data Endpoints`);
  console.log(`\n      Stats live (endpoint) - ${base}/api/stats/live`);
  console.log(`\n      Unique listeners (endpoint) - ${base}/api/stats/unique-by-hour`);
  console.log(`\n      Drop rate (endpoint) - ${base}/api/stats/interval-metrics`);
  console.log(`\n      Status / Health ${base}/health`);
  console.log(`\n\n    ${simpleLog()} System started  ✅\n`);
  console.log(` -------------------------------------------------------------------------\n`);
});

server.requestTimeout = 0;
server.keepAliveTimeout = 0;
server.timeout = 0;

process.on('SIGINT', () => {
  console.log(`\n   ${simpleLog()}  ❎  Shutting down...`);
  process.exit(0);
});