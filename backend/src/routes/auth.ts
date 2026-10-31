import crypto from 'crypto';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { COOKIE, requireAuth, uid } from '../auth';
import { config } from '../config';
import { pool } from '../db';
import { ah } from '../util';

const router = Router();
const STATE_COOKIE = 'oauth_state';

router.get('/google', (req, res) => {
  if (!config.google.clientId) return res.status(500).send('GOOGLE_CLIENT_ID is not configured in backend/.env');
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get(
  '/google/callback',
  ah(async (req, res) => {
    const { code, state } = req.query as Record<string, string>;
    if (!code || !state || state !== req.cookies?.[STATE_COOKIE]) {
      return res.redirect(`${config.frontendUrl}/login?error=oauth_state`);
    }
    res.clearCookie(STATE_COOKIE);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        redirect_uri: config.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokens: any = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      console.error('[auth] token exchange failed', tokens);
      return res.redirect(`${config.frontendUrl}/login?error=oauth_failed`);
    }

    const infoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const info: any = await infoRes.json();

    const { rows } = await pool.query(
      `INSERT INTO users (google_id, email, name, avatar) VALUES ($1,$2,$3,$4)
       ON CONFLICT (google_id) DO UPDATE SET email=EXCLUDED.email, name=EXCLUDED.name, avatar=EXCLUDED.avatar
       RETURNING id`,
      [info.sub, info.email, info.name || info.email, info.picture || null],
    );
    const session = jwt.sign({ uid: rows[0].id }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie(COOKIE, session, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 3600 * 1000 });
    res.redirect(`${config.frontendUrl}/scheduled`);
  }),
);

router.get(
  '/me',
  requireAuth,
  ah(async (req, res) => {
    const { rows } = await pool.query('SELECT id, email, name, avatar FROM users WHERE id=$1', [uid(req)]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    res.json(rows[0]);
  }),
);

router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

export default router;
