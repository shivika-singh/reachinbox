import { DelayedError, Job, Worker } from 'bullmq';
import nodemailer, { Transporter } from 'nodemailer';
import { config } from './config';
import { getEmailRow, pool } from './db';
import { buildJob, connection, emailQueue, EmailJobData, QUEUE_NAME } from './queue';
import { firstLimitHit, releaseSlot, takeSlot } from './redis';
import { indexEmails } from './search';
import { sendSlack } from './slack';
import { HOUR_MS, hourWindow } from './util';

const transports = new Map<string, Transporter>();
function getTransport(row: any) {
  let t = transports.get(row.sender_id);
  if (!t) {
    t = nodemailer.createTransport({
      host: row.smtp_host,
      port: row.smtp_port,
      secure: false,
      auth: { user: row.smtp_user, pass: row.smtp_pass },
    });
    transports.set(row.sender_id, t);
  }
  return t;
}

async function processEmail(job: Job<EmailJobData>, token?: string) {
  const { emailId, seq } = job.data;
  const row = await getEmailRow(emailId);
  if (!row) return { skipped: 'missing' };

  // Idempotency guard: never send the same email twice
  if (row.status === 'sent') return { skipped: 'already-sent' };

  // ---- Hourly rate limit (per sender, Redis-backed, atomic) ----
  const limit = Math.min(row.hourly_limit ?? config.maxEmailsPerHour, config.maxEmailsPerHour);
  const win = hourWindow();
  const allowed = await takeSlot(row.sender_id, win, limit);

  if (!allowed) {
    // Do NOT drop / fail. Push into the next hour window, keeping order via a tiny per-seq offset.
    const nextRun = (win + 1) * HOUR_MS + (seq % 5000) * 10;
    await pool.query('UPDATE emails SET status=\'scheduled\', scheduled_at=$2 WHERE id=$1', [emailId, new Date(nextRun)]);

    if (await firstLimitHit(row.sender_id, win)) {
      const when = new Date((win + 1) * HOUR_MS).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      await sendSlack(
        row.user_id,
        `:warning: *Hourly email limit reached* for sender \`${row.sender_email}\` (${limit}/hour). ` +
          `Remaining emails were rescheduled to the next hour window (from ${when}). Nothing was dropped.`,
      );
    }
    await job.moveToDelayed(nextRun, token);
    throw new DelayedError(); // tells BullMQ "I moved this job myself" (does not count as a failed attempt)
  }

  await pool.query('UPDATE emails SET status=\'sending\' WHERE id=$1 AND status=\'scheduled\'', [emailId]);

  try {
    const info = await getTransport(row).sendMail({
      from: row.sender_email,
      to: row.to_email,
      subject: row.subject,
      html: row.body,
      messageId: `<${emailId}@reachinbox.local>`, // deterministic -> duplicates are detectable
    });
    const preview = nodemailer.getTestMessageUrl(info) || null;
    await pool.query(
      `UPDATE emails SET status='sent', sent_at=now(), preview_url=$2, error=NULL WHERE id=$1`,
      [emailId, preview],
    );
    await indexEmails([await getEmailRow(emailId)]);
    console.log(`[worker] sent ${row.to_email} via ${row.sender_email}`);
    return { sent: true };
  } catch (err) {
    await releaseSlot(row.sender_id, win).catch(() => undefined); // failed send must not eat quota
    throw err; // BullMQ retries with backoff
  }
}

async function markFailed(emailId: string, message: string) {
  await pool.query(
    `UPDATE emails SET status='failed', error=$2, sent_at=now() WHERE id=$1 AND status<>'sent'`,
    [emailId, message.slice(0, 500)],
  );
  await indexEmails([await getEmailRow(emailId)]);
}

export function startWorker() {
  const worker = new Worker<EmailJobData>(QUEUE_NAME, processEmail, {
    connection,
    concurrency: config.workerConcurrency,
    // Global throttle across ALL workers: at most 1 send per MIN_DELAY_BETWEEN_EMAILS_MS
    limiter: { max: 1, duration: config.minDelayMs },
  });
  worker.on('failed', (job, err) => {
    if (!job) return;
    if (job.attemptsMade >= (job.opts.attempts ?? 1)) {
      markFailed(job.data.emailId, err.message).catch((e) => console.error(e));
    }
  });
  worker.on('error', (e) => console.error('[worker]', e.message));
  console.log(
    `[worker] started: concurrency=${config.workerConcurrency}, min delay=${config.minDelayMs}ms, ` +
      `max/hour/sender=${config.maxEmailsPerHour}`,
  );
  return worker;
}

/**
 * Safety net after a restart/crash: every DB email that is still pending but has no job in Redis
 * gets its job re-created (same jobId, so existing jobs are never duplicated).
 */
export async function reconcileJobs() {
  const { rows } = await pool.query(
    `SELECT id, seq, scheduled_at FROM emails WHERE status IN ('scheduled','sending')`,
  );
  let restored = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const existing = await Promise.all(chunk.map((r) => emailQueue.getJob(r.id)));
    const missing = chunk.filter((_, idx) => !existing[idx]);
    if (missing.length) {
      await emailQueue.addBulk(missing.map((r) => buildJob(r.id, r.seq, new Date(r.scheduled_at))));
      restored += missing.length;
    }
  }
  console.log(`[reconcile] ${rows.length} pending emails checked, ${restored} jobs restored`);
}
