import { Request, Response, NextFunction } from 'express';
import config from '../config/config.js';

export default function authPublish(req: Request, res: Response, next: NextFunction) {
  const auth = req.header('authorization');

  if (auth !== `Bearer ${config.publishToken}`) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  next();
}
