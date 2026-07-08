import { config as loadEnv } from 'dotenv';
import broadcaster from '../services/index.js';

loadEnv();

const { stationTitle, stationMessage } = broadcaster.getStreamInfo();

export default {
  http: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_URL || '',
  },

  ui: {
    stationTitle: stationTitle,
    stationMessage: stationMessage,
  },

  stream: {
    path: '/audio',
  },

  publishToken: process.env.PUBLISH_TOKEN ?? '',
};
