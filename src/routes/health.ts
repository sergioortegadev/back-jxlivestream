import { Router } from 'express';
import broadcaster from '../services/index.js';

const router = Router();

router.get('/', (_req, res) => {
  const stats = broadcaster.getStats();

  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),

    ...stats,

    stream: {
      publish: '/publish',
      audio: '/audio',
    },
  });
});

export default router;
