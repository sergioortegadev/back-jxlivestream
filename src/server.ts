/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
import NodeMediaServer from 'node-media-server';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/config.js';
import fs from 'fs';

// config de node-media-server
const nmsConfig = {
  rtmp: {
    port: config.rtmp.port,
    chunk_size: config.rtmp.chunk_size,
  },
  http: {
    port: config.http.port + 1, // NMS internal HTTP server uses a different port than Express
    mediaroot: config.http.mediaroot,
  },
  trans: {
    ffmpeg: config.ffmpeg.path,
    tasks: [
      {
        app: config.stream.app, // appname: jxlivestream
        vc: 'copy', // Video codec (copy = sin transcodificación)
        ac: 'aac', // Audio codec
        hls: true,
        hlsFlags: `[hls_list_size=${config.stream.hls.list_size}:hls_time=${config.stream.hls.time}]`,
      },
    ],
  },
};

const nms = new NodeMediaServer(nmsConfig);

// Express para servir web estática de prueba + endoints de info (url y health).
const app = express();
app.use(cors());

// Servir los archivos estáticos (web prueba)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.resolve(__dirname, 'public');
const mediaPath = path.resolve(__dirname, '../media');
app.use(express.static(publicPath));
app.use(express.static(mediaPath));

// Endpoing para obtener URL del stream (este usará la app desarrollada en React Native)
app.get('/api/stream-url', (req, res) => {
  const base = config.http.publicUrl || `${req.protocol}://${req.get('host')}`;
  const streamUrl = `${base}/${config.stream.app}/${config.stream.key}/index.m3u8`;
  res.json({ url: streamUrl });
});

// Endpoint para estado del server (Health)
app.get('/api/health', (req, res) => {
  const basePublic = config.http.publicUrl || `http://localhost:${config.http.port}`;
  let publicHost = 'localhost';
  if (config.http.publicUrl) {
    try {
      publicHost = new URL(config.http.publicUrl).hostname;
    } catch (e) {
      // ignore
    }
  }

  res.json({
    status: 'ok',
    rtpm: {
      host: publicHost,
      port: config.rtmp.port,
    },
    stream: {
      pushUrl: `rtmp://${publicHost}:${config.rtmp.port}/${config.stream.app}/${config.stream.key}`,
      playUrl: `${basePublic}/${config.stream.app}/${config.stream.key}/index.m3u8`,
    },
  });
});

// Hooks de node-media-server
nms.on('preConnect', (id, args) => {
  console.log(` [NMS] Conexión previa: ${id}`);
});
nms.on('postConnect', (id, args) => {
  console.log(` [NMS] Conexión establecida: ${id}`);
});
nms.on('doneConnect', (id, args) => {
  console.log(` [NMS] Conexión cerrada: ${id}`);
});

nms.on('prePublish', (id, StreamPath, args) => {
  console.log(` [NMS] Pre-Publish: ${StreamPath}`);
});
nms.on('postPublish', (id, StreamPath, args) => {
  console.log(` [NMS] ✅ Stream Publicado: ${StreamPath}`);
  const baseForLogs = config.http.publicUrl || `http://localhost:${config.http.port}`;
  console.log(`    -> Reproducir en ${baseForLogs}${StreamPath}/index.m3u8`);
});
nms.on('donePublish', (id, StreamPath, args) => {
  console.log(` [NMS] ❌ Stream Finalizado: ${StreamPath}`);
});

nms.on('prePlay', (id, StreamPath, args) => {
  console.log(` [NMS] Cliente conectado para reproducir: ${StreamPath}`);
});
nms.on('postPlay', (id, StreamPath, args) => {
  console.log(` [NMS] ▶️ Reproducción activa: ${StreamPath}`);
});

// Inicia server
nms.run();
app.listen(config.http.port, config.http.host, () => {
  console.log(`\n-----------------------------------------------------------------------`);
  console.log(`  📻  JxLiveStream runnig ok`);
  console.log(`-----------------------------------------------------------------------`);
  console.log(`\n     ⤷ 🔴 RTMP (push from OBS): `);
  console.log(
    `      rtmp://${config.http.publicUrl ? new URL(config.http.publicUrl).hostname : 'localhost'}:${config.rtmp.port}/${config.stream.app}/${config.stream.key}`
  );
  console.log(`\n     ▶️  HLS Stream (escuchar):`);
  console.log(
    `      ${config.http.publicUrl || `      ${config.http.host}:${config.http.port}/${config.stream.app}/${config.stream.key}/index.m3u8`}`
  );
  console.log(`\n     🌐 Web (test):`);
  console.log(`      ${config.http.publicUrl || `${config.http.host}:${config.http.port}`}`);
  console.log(`\n     🔗 API Health:`);
  console.log(
    `      ${config.http.publicUrl || `${config.http.host}:${config.http.port}/api/health`}`
  );
  console.log(`-----------------------------------------------------------------------`);
  console.log(`\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n  ✳️  Apagando servidor...');
  nms.stop();
  process.exit(0);
});
