import { Queue } from 'bullmq';
import { config } from './config';

export const QUEUE_NAME = 'email-queue';
export interface EmailJobData { emailId: string; seq: number }

function parseRedis(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username ? decodeURIComponent(u.username) : undefined,
    password: u.password ? decodeURIComponent(u.password) : undefined,
    tls: u.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null as null,
  };
}

export const connection = parseRedis(config.redisUrl);
export const emailQueue = new Queue<EmailJobData>(QUEUE_NAME, { connection });

/** jobId === email id  ->  BullMQ refuses a 2nd job with the same id (idempotent scheduling) */
export function buildJob(emailId: string, seq: number, runAt: Date) {
  return {
    name: 'send-email',
    data: { emailId, seq },
    opts: {
      jobId: emailId,
      delay: Math.max(0, runAt.getTime() - Date.now()),
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5000 },
      removeOnComplete: { age: 7 * 24 * 3600 }, // keep so the jobId stays reserved
      removeOnFail: false,
    },
  };
}
