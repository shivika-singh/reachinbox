# ReachInbox Email Scheduler (full-stack)

Schedules and sends emails at scale: Express + TypeScript + BullMQ/Redis + PostgreSQL + Elasticsearch + Ethereal SMTP,
with a React + Tailwind dashboard, Google login and Slack rate-limit alerts. **No cron anywhere.**

## Architecture

```
React (Vite, :5173) --/api proxy--> Express API (:4000) --> PostgreSQL   (source of truth: emails, users, senders, slack)
                                        |  --> Redis/BullMQ  (delayed jobs + hourly counters)
                                        |  --> Elasticsearch (search index)
                                        +--> BullMQ Worker --> Ethereal SMTP (3 fake sender accounts)
                       Bull Board UI: http://localhost:4000/admin/queues
```

**Flow:** `POST /api/emails/schedule` -> one DB row per recipient (status `scheduled`) -> one BullMQ **delayed job** per
email (`jobId = email id`) -> worker wakes at the right time -> rate-limit check -> SMTP send -> row becomes `sent`/`failed`
and is (re)indexed in Elasticsearch.

## Requirements covered

| Requirement | How |
|---|---|
| BullMQ delayed jobs, no cron | `emailQueue.addBulk` with `delay = scheduledAt - now` (`src/queue.ts`) |
| Survives restarts | Jobs live in Redis (AOF on), rows in Postgres. On boot `reconcileJobs()` re-creates any pending email whose job is missing |
| No duplicates / idempotent | `jobId = email id` (BullMQ rejects a second job with same id); worker skips rows already `sent`; deterministic `Message-ID` |
| Worker concurrency | `WORKER_CONCURRENCY` (default 5) |
| Min delay between sends | BullMQ `limiter {max:1, duration: MIN_DELAY_BETWEEN_EMAILS_MS}` = **2 seconds by default**, global across all workers. Plus the per-campaign "Delay between 2 emails" spaces `scheduled_at` values |
| Emails per hour | Redis atomic Lua counter, key `rl:{senderId}:{hourWindow}`, limit = `MAX_EMAILS_PER_HOUR_PER_SENDER` (default 200); the compose form's Hourly Limit can only lower it |
| Over the limit | Job is **not dropped/failed**: DB `scheduled_at` is moved to the next hour and the job is moved to delayed state (`moveToDelayed` + `DelayedError`, not counted as a failed attempt). Order is kept with a tiny per-`seq` offset |
| Multiple senders | `SENDER_COUNT` Ethereal accounts auto-created at first boot; pick one or "rotate across all" (round-robin) |
| Slack on limit hit | Real Slack OAuth (incoming-webhook), stored per user. One message per sender per hour window. Not connected -> silently skipped; connect later -> works immediately (webhook looked up at send time) |
| Search | Elasticsearch index `emails` (indexed on schedule and on send). Dashboard search box queries it; falls back to SQL `ILIKE` if ES is down |
| Live queue dashboard | Bull Board at `/admin/queues` |
| Google login | Real OAuth 2.0 authorization-code flow, session in httpOnly JWT cookie |

### Behaviour under load (1000+ emails at the same time)
- Scheduling inserts all rows in **one SQL statement** and enqueues in batches of 500 - fast and atomic per batch.
- The worker drains at `min(concurrency, 1 per MIN_DELAY)` and never exceeds the per-sender hourly cap.
- Anything over the cap flows into the following hour(s) automatically, in original order, with zero loss.
- Rate-limit counters are in Redis, so you can run several API/worker processes (`PORT=4001 npm run dev`) and the limits still hold.

### Trade-offs (be ready to explain)
- Fixed hour windows (clock hour) instead of a sliding window: simpler and atomic; a burst can straddle two windows.
- Delivery is at-least-once with idempotency guards; a crash in the tiny gap between SMTP accept and the DB update could re-send once (the deterministic Message-ID makes it detectable).
- Bull Board is unauthenticated for demo convenience - put it behind auth in production.

## Setup

Prerequisites: Node 18+ (20 recommended), Docker Desktop, internet access (Ethereal, Google, Slack).

### 1. Infrastructure
```bash
docker compose up -d        # Postgres :5432, Redis :6379, Elasticsearch :9200
```

### 2. Google OAuth (needed for login)
1. https://console.cloud.google.com -> create project -> **APIs & Services -> OAuth consent screen** (External, add yourself as a test user).
2. **Credentials -> Create credentials -> OAuth client ID -> Web application.**
3. Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`
4. Copy Client ID and Secret.

### 3. Slack app (needed for the Slack alert)
1. https://api.slack.com/apps -> **Create New App -> From scratch**, pick your workspace.
2. **OAuth & Permissions** -> Redirect URLs: `http://localhost:4000/api/slack/callback` -> Scopes: add **`incoming-webhook`**.
3. Copy Client ID / Client Secret from **Basic Information**.
4. If Slack refuses a non-https redirect: run `ngrok http 4000`, use `https://<id>.ngrok-free.app/api/slack/callback` in both Slack and `SLACK_REDIRECT_URI`.

### 4. Backend
```bash
cd backend
cp .env.example .env        # fill GOOGLE_*, SLACK_*, JWT_SECRET
npm install
npm run dev
```
Expected logs: `Elasticsearch ready`, `created Ethereal sender ...` (first run), `worker started`, `API: http://localhost:4000`.

### 5. Frontend
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

## Demo script

1. **Login** - open http://localhost:5173 -> *Login with Google*. Header shows your name, email, avatar; logout works.
2. **Connect Slack** - sidebar -> *Connect Slack* -> pick a channel -> you return with a success toast and a hello message in Slack.
3. **Compose** - *Compose*, subject/body, *Upload List* with a CSV (shows "N email addresses detected"), set delay + hourly limit.
4. **Schedule** - clock icon -> *In 2 minutes* -> *Done* -> *Schedule*. Rows appear in **Scheduled** with status and time.
5. **Queue UI** - open http://localhost:4000/admin/queues and show the delayed jobs counting down.
6. **Sent** - after the time passes, emails move to **Sent**; open one -> *View delivered message on Ethereal*.
7. **Restart persistence** - schedule 5 mails ~3 min ahead, press Ctrl+C on the backend, start it again with `npm run dev`
   (log shows `reconcile ... 0 jobs restored` because Redis kept them). They still send once, at the right time, no duplicates.
8. **Rate limit + Slack** - Compose with a specific sender, **Hourly Limit = 2**, 5 recipients, delay 0, send now. Two are sent, the other three
   flip to next-hour times in Scheduled, a Slack message arrives, and Bull Board shows them in *Delayed*.
9. **Search** - type a recipient or subject word in the top search box (served by Elasticsearch).
10. **Disconnect Slack** -> trigger a limit again: nothing crashes, no message. Reconnect -> alerts work again without restart.

Tip: set `MIN_DELAY_BETWEEN_EMAILS_MS=500` in `.env` for faster demos.

## API summary (all under `/api`, cookie auth)
`GET /auth/google` - `GET /auth/google/callback` - `GET /auth/me` - `POST /auth/logout`
`GET /emails/meta` - `POST /emails/schedule` - `GET /emails?status=scheduled|sent&q=` - `GET /emails/counts` - `GET /emails/:id`
`GET /slack/connect-url` - `GET /slack/callback` - `GET /slack/status` - `POST /slack/test` - `DELETE /slack`

## Project layout
```
backend/src  config.ts db.ts queue.ts redis.ts worker.ts search.ts slack.ts auth.ts util.ts index.ts routes/{auth,emails,slack}.ts
frontend/src api/ components/{ui,layout,email}/ context/ hooks/ pages/ utils/ types.ts
```
