# X Bulk Unfollow

A web app (Next.js + Prisma) for cleaning up who you follow on X (Twitter),
similar to Circleboom's unfollow tools:

1. **Unfollow accounts that don't follow you back**
2. **Unfollow non-Premium (no blue check) accounts**
3. **Unfollow accounts inactive for 90+ days**
4. **Remove followers inactive for 90+ days**

Bulk actions run through a rate-limit-aware background queue instead of
firing requests all at once, and every action requires an explicit review +
confirmation step before it touches your account.

## Requirements

- Node.js 20+
- An X Developer account with **Basic tier API access or higher**
  (developer.x.com). The Free tier does not expose the followers/following
  list endpoints or usable follow/unfollow write limits, so this app can't
  function on it.

## X Developer Portal setup

1. Create a Project + App at https://developer.x.com.
2. Under the app's **User authentication settings**, enable OAuth 2.0, app
   type "Web App, Automated App or Bot", and set:
   - Callback URI: `http://localhost:3000/api/auth/callback` (add your
     production URL too when you deploy)
   - Scopes: `tweet.read`, `users.read`, `follows.read`, `follows.write`,
     `block.read`, `block.write`, `offline.access`
3. Copy the **Client ID** (and **Client Secret**, if your app is a
   confidential client) into `.env`.

## Setup

```bash
npm install
cp .env.example .env   # fill in X_CLIENT_ID, X_CLIENT_SECRET, SESSION_SECRET, TOKEN_ENCRYPTION_KEY
npx prisma migrate deploy
npm run dev
```

Generate `SESSION_SECRET` and `TOKEN_ENCRYPTION_KEY` with:

```bash
openssl rand -base64 32
```

Then open http://localhost:3000 and sign in with X.

## How it works

- **Scan**: reads your full following/followers lists (paginated) via the
  X API v2, plus each account's `most_recent_tweet_id`, batch-resolved to a
  `created_at` timestamp to determine 90-day inactivity. Results are stored
  per category in the `ScanResult` table.
- **Premium detection**: an account counts as Premium if its
  `verified_type` is `blue` or `business`.
- **Bulk actions**: each action creates a `Job` with one `JobItem` per
  target account. A background worker (`src/lib/worker.ts`) processes one
  item at a time, paced by `MIN_ACTION_INTERVAL_MS`, and pauses the job
  until the reset time whenever X returns HTTP 429.
- **Remove follower**: X's API has no direct "remove follower" endpoint, so
  this app blocks then immediately unblocks the account, which removes
  them as a follower without leaving them blocked.
- **Profile stats**: the dashboard's KPI row (followers, following, posts in
  the last 30 days, follower growth over 30 days) is cheap to refresh
  compared to a full scan — it's one `GET /users/me` call plus a paginated
  read of your own recent posts, throttled to once per
  `MIN_PROFILE_REFRESH_INTERVAL_MS` (default 6h) and cached in
  `ProfileSnapshot`. X exposes no history endpoint for follower counts, so
  30-day growth is computed from snapshots this app has taken itself —
  it's only meaningful once the app has been running for ~30 days; until
  then the UI shows growth "since" the first snapshot instead.

### Running the background worker

By default, `src/instrumentation.ts` starts an in-process interval when the
app runs as a long-running Node server (`npm run start`). If you deploy to
a serverless platform instead, point an external cron at
`POST /api/jobs/tick` every few seconds (protect it with `CRON_SECRET`).

## Data & security

- OAuth access/refresh tokens are encrypted at rest (AES-256-GCM) using
  `TOKEN_ENCRYPTION_KEY` and never exposed to the client.
- Sessions are stored in a signed, encrypted cookie (`iron-session`) keyed
  by `SESSION_SECRET`.
- Uses Postgres (via `DATABASE_URL`). For local development without a
  Postgres server handy, point it at any local/hosted Postgres instance —
  the schema avoids native enum types so it stays portable across engines.

## Deploy to Railway

This app assumes a long-running Node process (for the in-process job
worker), which fits Railway's model directly — no serverless/cron
workaround needed.

1. **Create the service**: in the Railway dashboard, New Project → Deploy
   from GitHub repo → select this repo and the branch you want deployed.
   Railway auto-detects Next.js via Nixpacks; the `build`/`start` scripts in
   `package.json` already run `prisma generate`/`prisma migrate deploy` at
   the right times.
2. **Add Postgres**: in the same project, "+ New" → Database → PostgreSQL.
   Railway creates a `DATABASE_URL` variable on that Postgres service.
3. **Generate a public domain** for the web service: Settings → Networking
   → Generate Domain. Note the URL (e.g. `https://your-app.up.railway.app`).
4. **Set environment variables** on the web service:
   - `DATABASE_URL` → reference the Postgres service's variable (Railway
     lets you pick `${{Postgres.DATABASE_URL}}` from the variable picker)
   - `X_CLIENT_ID` / `X_CLIENT_SECRET` → from the X Developer Portal
   - `X_REDIRECT_URI` → `https://<your-railway-domain>/api/auth/callback`
   - `SESSION_SECRET` / `TOKEN_ENCRYPTION_KEY` → each `openssl rand -base64 32`
   - `MIN_ACTION_INTERVAL_MS` → `3000` (optional, this is the default)
5. **Add the same callback URL** (`https://<your-railway-domain>/api/auth/callback`)
   to the X app's OAuth 2.0 callback URI list in the Developer Portal —
   X rejects callbacks that aren't explicitly allow-listed there.
6. Redeploy (Railway redeploys automatically on env var changes), then open
   the domain and sign in with X to confirm everything's wired up.

Prefer the CLI? `railway login`, `railway link` (to an existing project),
then `railway up` to deploy and `railway variables --set KEY=VALUE` to set
each env var above.

## Rate limits

X API v2 follow/unfollow and block endpoints have tight, tier-dependent
rate limits that change over time. This app doesn't hardcode assumptions
about your exact limit — it paces requests conservatively and reacts to
live `429` responses (via `x-rate-limit-reset`) by pausing the job, so
large cleanups may take a while to fully complete.
