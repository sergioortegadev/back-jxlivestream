import { config as loadEnv } from 'dotenv';

loadEnv();

export default {
  http: {
    port: Number(process.env.PORT) || 8000,
    host: process.env.HOST || '0.0.0.0',
    publicUrl: process.env.PUBLIC_URL || '',
  },

  stream: {
    path: '/audio',
  },
};
