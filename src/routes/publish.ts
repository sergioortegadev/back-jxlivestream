/* eslint-disable no-console */
import { Router } from 'express';
import broadcaster from '../services/index.js';
import authPublish from '../middleware/authPublish.js';
import { simpleLog } from '../helpers/helpers.js';

const router = Router();

router.post('/', authPublish, (req, res) => {
  console.log(`  ${simpleLog()}   ✅ Publisher conectado\n`);

  const stationTitle   = typeof req.headers['x-station-title']   === 'string' ? req.headers['x-station-title']   : '';
  const stationSubTitle = typeof req.headers['x-station-subtitle'] === 'string' ? req.headers['x-station-subtitle'] : '';
  const stationDescription = typeof req.headers['x-station-description'] === 'string' ? req.headers['x-station-description'] : '';
  broadcaster.setStreamInfo(stationTitle, stationSubTitle, stationDescription);

  broadcaster.publisherStarted();

  let finished = false;

  const stopPublisher = () => {
    if (finished) return;

    finished = true;
    broadcaster.publisherStopped();
  };

  req.on('data', (chunk: Buffer) => {
    broadcaster.publish(chunk);
  });

  req.on('end', () => {
    console.log(`  ${simpleLog()}   🔸 Publisher desconectado`);

    stopPublisher();

    res.sendStatus(200);
  });

  req.on('aborted', () => {
    console.log(`  ${simpleLog()}   🔸 Publisher desconectado (aborted)`);

    stopPublisher();
  });

  req.on('close', () => {
    stopPublisher();
  });

  req.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err);

    // `aborted` ocurre cuando el emisor corta o reconecta; no es un 500 del servidor.
    if (message.toLowerCase().includes('aborted')) {
      console.log(`  ${simpleLog()}   🔸 Publisher desconectado (aborted)`);
      stopPublisher();

      return;
    }

    console.error(`  ${simpleLog()}   Error (500) en publish: ${message}`);

    stopPublisher();

    if (!res.headersSent) {
      res.sendStatus(500);
    }
  });
});

export default router;
