/* eslint-disable no-console */
import { Router } from 'express';
import broadcaster from '../services/index.js';
import authPublish from '../middleware/authPublish.js';

const router = Router();

router.post('/', authPublish, (req, res) => {
  console.log('   ✅ Publisher conectado');

  broadcaster.publisherStarted();

  req.on('data', (chunk: Buffer) => {
    broadcaster.publish(chunk);
  });

  req.on('end', () => {
    console.log('   ✳️ Publisher desconectado');

    broadcaster.publisherStopped();

    res.sendStatus(200);
  });

  req.on('close', () => {
    broadcaster.publisherStopped();
  });

  req.on('error', (err) => {
    console.error(` Error en publish: ${err}`);

    broadcaster.publisherStopped();

    if (!res.headersSent) {
      res.sendStatus(500);
    }
  });
});

export default router;
