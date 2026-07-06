/* eslint-disable no-console */
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import broadcaster from '../services/index.js';
import { simpleLog } from '../helpers/helpers.js';
import config from '../config/config.js';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  // ✅ NUEVO: Generar ID único y obtener IP
  const listenerId = uuidv4();
  const ipAddress = req.ip || 'unknown';
  const deviceType = req.query.device as string | undefined;

  // Headers ICY (Icecast) — indican al browser desktop que es un stream en vivo
  // Sin estos headers, Chrome/Firefox/Edge tratan la respuesta como un archivo
  // que nunca termina de cargar y nunca inician la reproducción.
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('icy-br', '128');
  res.setHeader('icy-metaint', '0');
  res.setHeader('icy-name', config.ui.stationTitle);
  res.setHeader('icy-pub', '1');

  // ✅ MODIFICADO: Pasar parámetros a subscribe
  broadcaster.subscribe(res, listenerId, ipAddress, deviceType);

  console.log(`${simpleLog()} 🔗 Nueva conexión: ${listenerId} - [${broadcaster.getStats().listeners} Oyentes]`);
});

export default router;