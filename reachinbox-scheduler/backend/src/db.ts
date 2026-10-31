import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { config } from './config';

export const pool = new Pool({ connectionString: config.databaseUrl });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      google_id text UNIQUE NOT NULL,
      email text NOT NULL,
      name text NOT NULL,
      avatar text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS senders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      smtp_host text NOT NULL,
      smtp_port int NOT NULL,
      smtp_user text NOT NULL,
      smtp_pass text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS emails (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      sender_id uuid NOT NULL REFERENCES senders(id),
      batch_id uuid NOT NULL,
      seq int NOT NULL DEFAULT 0,
      to_email text NOT NULL,
      subject text NOT NULL,
      body text NOT NULL,
      status text NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled','sending','sent','failed')),
      scheduled_at timestamptz NOT NULL,
      sent_at timestamptz,
      hourly_limit int,
      preview_url text,
      error text,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS emails_user_status_idx ON emails (user_id, status, scheduled_at);
    CREATE TABLE IF NOT EXISTS slack_connections (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      webhook_url text NOT NULL,
      channel text,
      team_name text,
      connected_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}

/** Make sure SENDER_COUNT Ethereal (fake SMTP) accounts exist. Needs internet once. */
export async function ensureSenders() {
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM senders');
  const missing = config.senderCount - rows[0].n;
  for (let i = 0; i < missing; i++) {
    const acc = await nodemailer.createTestAccount();
    await pool.query(
      `INSERT INTO senders (email, smtp_host, smtp_port, smtp_user, smtp_pass)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (email) DO NOTHING`,
      [acc.user, acc.smtp.host, acc.smtp.port, acc.user, acc.pass],
    );
    console.log(`[senders] created Ethereal sender ${acc.user}`);
  }
}

export async function getEmailRow(id: string) {
  const { rows } = await pool.query(
    `SELECT e.*, s.email AS sender_email, s.smtp_host, s.smtp_port, s.smtp_user, s.smtp_pass
     FROM emails e JOIN senders s ON s.id = e.sender_id WHERE e.id = $1`,
    [id],
  );
  return rows[0] as any | undefined;
}
