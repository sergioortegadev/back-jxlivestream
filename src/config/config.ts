import { config as loadEnv } from 'dotenv';
import broadcaster from '../services/index.js';

loadEnv();

const { stationTitle, stationSubTitle, stationDescription } = broadcaster.getStreamInfo();

export default {
  http: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_URL || '',
  },

  ui: {
    stationTitle: stationTitle || 'JxLiveStream', 
    stationSubTitle: stationSubTitle || 'Escucha la transmisión en vivo',
    stationDescription: stationDescription || '',
  },

  stream: {
    path: '/audio',
  },

  publishToken: process.env.PUBLISH_TOKEN ?? '',
};
