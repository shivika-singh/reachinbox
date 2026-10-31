import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { config } from './config';
import { ensureSenders, initDb, pool } from './db';
import { emailQueue } from './queue';
import { redis } from './redis';
import authRoutes from './routes/auth';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';
import { initSearch } from './search';
import { reconcileJobs, startWorker } from './worker';

async function main() {
  await initDb();
  await ensureSenders();
  await initSearch();

  const app = express();
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Live BullMQ dashboard
  const board = new ExpressAdapter();
  board.setBasePath('/admin/queues');
  createBullBoard({ queues: [new BullMQAdapter(emailQueue)], serverAdapter: board });
  app.use('/admin/queues', board.getRouter());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRoutes);
  app.use('/api/emails', emailRoutes);
  app.use('/api/slack', slackRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error]', err);
    res.status(500).json({ error: 'Something went wrong on the server' });
  });

  await reconcileJobs();
  const worker = startWorker();
  const server = app.listen(config.port, () => {
    console.log(`API:        http://localhost:${config.port}`);
    console.log(`Queue UI:   http://localhost:${config.port}/admin/queues`);
  });

  const shutdown = async () => {
    console.log('Shutting down...');
    server.close();
    await worker.close(); // lets in-flight jobs finish; waiting jobs stay safely in Redis
    await emailQueue.close();
    await pool.end();
    redis.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((e) => {
  console.error('Fatal startup error:', e);
  process.exit(1);
});
