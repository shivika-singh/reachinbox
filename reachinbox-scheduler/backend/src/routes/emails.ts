import crypto from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, uid } from '../auth';
import { config } from '../config';
import { pool } from '../db';
import { buildJob, emailQueue } from '../queue';
import { indexEmails, searchEmails } from '../search';
import { ah, toDto } from '../util';

const router = Router();
router.use(requireAuth);

const scheduleSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().min(1),
  recipients: z.array(z.string().trim().email()).min(1).max(5000),
  startTime: z.string().datetime({ offset: true }).optional(),
  delaySeconds: z.number().min(0).max(86400).default(0),
  hourlyLimit: z.number().int().min(1).optional(),
  senderId: z.string().uuid().nullable().optional(),
});

// Config the frontend needs (senders + limits)
router.get(
  '/meta',
  ah(async (_req, res) => {
    const { rows } = await pool.query('SELECT id, email FROM senders ORDER BY created_at');
    res.json({
      senders: rows,
      limits: { maxEmailsPerHour: config.maxEmailsPerHour, minDelayMs: config.minDelayMs },
    });
  }),
);

router.post(
  '/schedule',
  ah(async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') });
    }
    const d = parsed.data;
    const recipients = [...new Set(d.recipients.map((r) => r.toLowerCase()))];

    const { rows: senders } = await pool.query('SELECT id FROM senders ORDER BY created_at');
    if (!senders.length) return res.status(500).json({ error: 'No sender accounts configured' });
    if (d.senderId && !senders.some((s) => s.id === d.senderId)) {
      return res.status(400).json({ error: 'Unknown sender' });
    }

    const start = d.startTime ? new Date(d.startTime) : new Date();
    const startMs = Math.max(start.getTime(), Date.now());
    const hourly = Math.min(d.hourlyLimit ?? config.maxEmailsPerHour, config.maxEmailsPerHour);
    const batchId = crypto.randomUUID();

    const senderIds: string[] = [];
    const seqs: number[] = [];
    const tos: string[] = [];
    const times: Date[] = [];
    recipients.forEach((to, i) => {
      senderIds.push(d.senderId ?? senders[i % senders.length].id); // no sender chosen -> rotate
      seqs.push(i);
      tos.push(to);
      times.push(new Date(startMs + i * d.delaySeconds * 1000));
    });

    // 1) persist in Postgres  2) enqueue delayed BullMQ jobs (jobId = email id)
    const { rows } = await pool.query(
      `INSERT INTO emails (user_id, sender_id, batch_id, seq, to_email, subject, body, scheduled_at, hourly_limit)
       SELECT $1, u.sender_id, $2, u.seq, u.to_email, $3, $4, u.scheduled_at, $5
       FROM unnest($6::uuid[], $7::int[], $8::text[], $9::timestamptz[])
         AS u(sender_id, seq, to_email, scheduled_at)
       RETURNING id, seq, scheduled_at`,
      [uid(req), batchId, d.subject, d.body, hourly, senderIds, seqs, tos, times],
    );
    for (let i = 0; i < rows.length; i += 500) {
      await emailQueue.addBulk(
        rows.slice(i, i + 500).map((r) => buildJob(r.id, r.seq, new Date(r.scheduled_at))),
      );
    }

    const { rows: full } = await pool.query(
      `SELECT e.*, s.email AS sender_email FROM emails e JOIN senders s ON s.id=e.sender_id WHERE e.batch_id=$1`,
      [batchId],
    );
    await indexEmails(full);

    res.status(201).json({ batchId, count: rows.length, firstSendAt: times[0], lastSendAt: times[times.length - 1] });
  }),
);

router.get(
  '/counts',
  ah(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT
         count(*) FILTER (WHERE status IN ('scheduled','sending'))::int AS scheduled,
         count(*) FILTER (WHERE status IN ('sent','failed'))::int AS sent
       FROM emails WHERE user_id=$1`,
      [uid(req)],
    );
    res.json(rows[0]);
  }),
);

router.get(
  '/',
  ah(async (req, res) => {
    const tab = req.query.status === 'sent' ? 'sent' : 'scheduled';
    const statuses = tab === 'sent' ? ['sent', 'failed'] : ['scheduled', 'sending'];
    const q = String(req.query.q ?? '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    if (q) {
      const hit = await searchEmails({ userId: uid(req), q, statuses, limit, offset, sent: tab === 'sent' });
      if (hit) return res.json(hit); // Elasticsearch result
    }

    const params: unknown[] = [uid(req), statuses];
    let where = 'e.user_id=$1 AND e.status = ANY($2)';
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (e.to_email ILIKE $3 OR e.subject ILIKE $3 OR e.body ILIKE $3)`;
    }
    const order = tab === 'sent' ? 'e.sent_at DESC NULLS LAST' : 'e.scheduled_at ASC, e.seq ASC';
    const list = await pool.query(
      `SELECT e.*, s.email AS sender_email FROM emails e JOIN senders s ON s.id=e.sender_id
       WHERE ${where} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const count = await pool.query(`SELECT count(*)::int AS n FROM emails e WHERE ${where}`, params);
    res.json({ items: list.rows.map(toDto), total: count.rows[0].n });
  }),
);

router.get(
  '/:id',
  ah(async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) return res.status(404).json({ error: 'Not found' });
    const { rows } = await pool.query(
      `SELECT e.*, s.email AS sender_email FROM emails e JOIN senders s ON s.id=e.sender_id
       WHERE e.id=$1 AND e.user_id=$2`,
      [req.params.id, uid(req)],
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(toDto(rows[0]));
  }),
);

export default router;
