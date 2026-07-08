import { createClient } from '@libsql/client';
import { config as loadEnv } from 'dotenv';

loadEnv();

const turso = createClient({
  url: process.env.TURSO_CONNECTION_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export default turso;