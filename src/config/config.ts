import { config as loadEnv } from 'dotenv';

loadEnv();

export default {
  http: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_URL || '',
  },

  ui: {
    stationTitle: process.env.STATION_TITLE || 'JxLiveRadio',
  },

  stream: {
    path: '/audio',
  },

  publishToken: process.env.PUBLISH_TOKEN ?? '',
};
