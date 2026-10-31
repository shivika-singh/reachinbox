import 'dotenv/config';

const str = (k: string, d = '') => process.env[k] ?? d;
const num = (k: string, d: number) => {
  const v = Number(process.env[k]);
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const config = {
  port: num('PORT', 4000),
  frontendUrl: str('FRONTEND_URL', 'http://localhost:5173'),
  databaseUrl: str('DATABASE_URL', 'postgres://reachinbox:reachinbox@localhost:5432/reachinbox'),
  redisUrl: str('REDIS_URL', 'redis://localhost:6379'),
  esUrl: str('ELASTICSEARCH_URL', 'http://localhost:9200'),
  jwtSecret: str('JWT_SECRET', 'dev-secret-change-me'),
  google: {
    clientId: str('GOOGLE_CLIENT_ID'),
    clientSecret: str('GOOGLE_CLIENT_SECRET'),
    redirectUri: str('GOOGLE_REDIRECT_URI', 'http://localhost:4000/api/auth/google/callback'),
  },
  slack: {
    clientId: str('SLACK_CLIENT_ID'),
    clientSecret: str('SLACK_CLIENT_SECRET'),
    redirectUri: str('SLACK_REDIRECT_URI', 'http://localhost:4000/api/slack/callback'),
  },
  workerConcurrency: num('WORKER_CONCURRENCY', 5),
  minDelayMs: num('MIN_DELAY_BETWEEN_EMAILS_MS', 2000),
  maxEmailsPerHour: num('MAX_EMAILS_PER_HOUR_PER_SENDER', 200),
  senderCount: num('SENDER_COUNT', 3),
};
