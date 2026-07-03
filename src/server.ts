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
// import broadcaster from './services/index.js';

const app = express();
app.use(cors());

// Servir los archivos estáticos (web prueba)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

app.use('/publish', publishRoute);

app.use('/audio', audioRoute);

// Endpoing para obtener URL del stream (este usará la app desarrollada en React Native)
app.get('/api/stream-url', (req, res) => {
  const base = config.http.publicUrl || `${req.protocol}://${req.get('host')}`;

  res.json({
    url: `${base}/audio`,
  });
});

// Endpoint para estado del server (Health)
app.use('/health', healthRoute);

// Inicia server
const server = app.listen(config.http.port, config.http.host, () => {
  const base = config.http.publicUrl || `http://${config.http.host}:${config.http.port}`;

  console.log(`\n -------------------------------------------------------------------------`);
  console.log(`  📻  JxLiveStream runnig ok`);
  console.log(` -------------------------------------------------------------------------`);
  console.log(`\n   ⤷ 🔴 (push from OBS) -> sender -> POST ${base}/publish`);

  console.log(`\n   🎧 GET - ${base}/audio`);

  console.log(`\n   🌐 Web (test): ${base}`);

  console.log(`\n   ❤️  ${base}/health`);
  console.log(
    `      ${config.http.publicUrl || `${config.http.host}:${config.http.port}/api/health`}`
  );
  console.log(`\n    ${simpleLog()} Inicio del sistema \n`);
  
  console.log(` -------------------------------------------------------------------------`);
  console.log(`\n`);
});

// `/publish` es un POST largo (streaming), por eso no debe expirar a los 5 minutos.
server.requestTimeout = 0;

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n   ${simpleLog()}  ✳️  Apagando servidor...`);
  process.exit(0);
});
