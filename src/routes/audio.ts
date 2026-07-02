import { Router } from 'express';
import broadcaster from '../services/index.js';

const router = Router();

router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });

  broadcaster.subscribe(res);

  req.on('close', () => {
    broadcaster.unsubscribe(res);
  });
});

export default router;
