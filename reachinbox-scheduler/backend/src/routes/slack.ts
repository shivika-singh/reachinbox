import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, uid } from '../auth';
import { config } from '../config';
import { pool } from '../db';
import { sendSlack } from '../slack';
import { ah } from '../util';

const router = Router();

// Step 1: frontend asks for the Slack authorize URL (state = signed token carrying the user id)
router.get('/connect-url', requireAuth, (req, res) => {
  if (!config.slack.clientId || !config.slack.clientSecret) {
    return res.status(400).json({ error: 'Slack app is not configured (SLACK_CLIENT_ID / SLACK_CLIENT_SECRET)' });
  }
  const state = jwt.sign({ uid: uid(req), purpose: 'slack' }, config.jwtSecret, { expiresIn: '10m' });
  const params = new URLSearchParams({
    client_id: config.slack.clientId,
    scope: 'incoming-webhook',
    redirect_uri: config.slack.redirectUri,
    state,
  });
  res.json({ url: `https://slack.com/oauth/v2/authorize?${params}` });
});

// Step 2: Slack redirects the browser here with ?code=...
router.get(
  '/callback',
  ah(async (req, res) => {
    const { code, state, error } = req.query as Record<string, string>;
    const back = (s: string) => res.redirect(`${config.frontendUrl}/scheduled?slack=${s}`);
    if (error || !code || !state) return back('error');

    let userId: string;
    try {
      const p = jwt.verify(state, config.jwtSecret) as { uid: string; purpose: string };
      if (p.purpose !== 'slack') return back('error');
      userId = p.uid;
    } catch {
      return back('error');
    }

    const r = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        redirect_uri: config.slack.redirectUri,
      }),
    });
    const data: any = await r.json();
    if (!data.ok || !data.incoming_webhook?.url) {
      console.error('[slack] oauth failed', data);
      return back('error');
    }
    await pool.query(
      `INSERT INTO slack_connections (user_id, webhook_url, channel, team_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET webhook_url=EXCLUDED.webhook_url, channel=EXCLUDED.channel,
         team_name=EXCLUDED.team_name, connected_at=now()`,
      [userId, data.incoming_webhook.url, data.incoming_webhook.channel, data.team?.name],
    );
    await sendSlack(userId, ':white_check_mark: ReachInbox Scheduler is connected. Rate-limit alerts will appear here.');
    back('connected');
  }),
);

router.get(
  '/status',
  requireAuth,
  ah(async (req, res) => {
    const { rows } = await pool.query('SELECT channel, team_name FROM slack_connections WHERE user_id=$1', [uid(req)]);
    res.json(rows[0] ? { connected: true, channel: rows[0].channel, teamName: rows[0].team_name } : { connected: false });
  }),
);

router.post(
  '/test',
  requireAuth,
  ah(async (req, res) => {
    const ok = await sendSlack(uid(req), ':bell: Test message from ReachInbox Scheduler.');
    if (!ok) return res.status(400).json({ error: 'Slack is not connected or the message failed' });
    res.json({ ok: true });
  }),
);

router.delete(
  '/',
  requireAuth,
  ah(async (req, res) => {
    await pool.query('DELETE FROM slack_connections WHERE user_id=$1', [uid(req)]);
    res.json({ ok: true });
  }),
);

export default router;
