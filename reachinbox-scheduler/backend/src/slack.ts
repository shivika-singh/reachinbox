import { pool } from './db';

/** Posts to the user's connected Slack. Silently does nothing if Slack isn't connected. */
export async function sendSlack(userId: string, text: string): Promise<boolean> {
  try {
    const { rows } = await pool.query('SELECT webhook_url FROM slack_connections WHERE user_id=$1', [userId]);
    if (!rows[0]) return false; // not connected -> skip, no crash
    const res = await fetch(rows[0].webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) console.error('[slack] webhook responded', res.status, await res.text());
    else console.log('[slack] notification delivered');
    return res.ok;
  } catch (e: any) {
    console.error('[slack] failed', e.message);
    return false;
  }
}
