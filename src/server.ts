/* eslint-disable no-console */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import publishRoute from './routes/publish.js';
import audioRoute from './routes/audio.js';
import broadcaster from './services/index.js';

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
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    listeners: broadcaster.getStats().listeners,
    bufferedChunks: broadcaster.getStats().bufferedChunks,
    stream: {
      publish: '/publish',
      audio: '/audio',
    },
  });
});


// Inicia server
app.listen(config.http.port, config.http.host, () => {
  const base =
    config.http.publicUrl ||
    `http://${config.http.host}:${config.http.port}`;

  console.log(`\n -------------------------------------------------------------------------`);
  console.log(`  📻  JxLiveStream runnig ok`);
  console.log(` -------------------------------------------------------------------------`);
  console.log(`\n   ⤷ 🔴 (push from OBS) -> sender -> POST ${base}/publish`);
  
  console.log(`\n   🎧 GET - ${base}/audio`);
  
  console.log(`\n   🌐 Web (test): ${base}`);
  
  console.log(`\n   ❤️  ${base}/api/health`);
  console.log(
    `      ${config.http.publicUrl || `${config.http.host}:${config.http.port}/api/health`}`
  );
  console.log(` -------------------------------------------------------------------------`);
  console.log(`\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  ✳️  Apagando servidor...');
  process.exit(0);
});
