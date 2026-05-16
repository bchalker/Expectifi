# Deploy to Railway (Hobby plan)

One **web service** runs the Express API and serves the built React app from the same URL (so `/api` works without a separate proxy).

## Architecture

| Railway resource | Purpose |
|------------------|---------|
| **Web service** (this repo) | Docker build → `client/dist` + Node API on `PORT` |
| **MySQL** (plugin) | User accounts, scenarios; linked via env vars |

## 1. Push code to GitHub

Railway deploys from Git. Commit and push `main` (including `Dockerfile`, `railway.toml`, and server static serving).

## 2. Create the Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select `retirement_calc_app` (or your fork).
3. Railway creates a service from the repo. It should detect **`Dockerfile`** via `railway.toml`.

## 3. Add MySQL

1. In the project: **+ New** → **Database** → **MySQL**.
2. Open the **web service** → **Variables** → **Add variable** (or **Reference**).
3. Link MySQL to the web service (Railway UI: “Connect” / shared variables). The app reads:

   - `MYSQL_URL` (if provided), or  
   - `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`

   Schema is applied automatically on boot (`ensureSchema`).

## 4. Configure web service variables

In the **web service** → **Variables**, set:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Long random string (≥32 chars) |
| `CLIENT_ORIGIN` | Your public app URL, e.g. `https://your-app.up.railway.app` (no trailing slash) |
| `API_PUBLIC_URL` | Same as `CLIENT_ORIGIN` |
| `GOOGLE_CLIENT_ID` | Optional |
| `GOOGLE_CLIENT_SECRET` | Optional |
| `STRIPE_SECRET_KEY` | `sk_live_...` or `sk_test_...` |
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` or `pk_test_...` — **required at build time** |

**Build-time Stripe key:** For `VITE_STRIPE_PUBLISHABLE_KEY`, open the variable settings and enable **Available at build** (Railway passes it into the Docker build as `ARG`).

**Do not set** `USE_STAGING_DB` in production.

`PORT` is set by Railway automatically — do not hardcode it.

### Google OAuth

In Google Cloud Console → OAuth client → **Authorized redirect URIs**:

```text
https://YOUR-PUBLIC-DOMAIN/api/auth/google/callback
```

Use the Railway-generated domain or your custom domain.

## 5. Public URL

1. Web service → **Settings** → **Networking** → **Generate Domain** (e.g. `something.up.railway.app`).
2. Set `CLIENT_ORIGIN` and `API_PUBLIC_URL` to that HTTPS URL.
3. Redeploy if you changed those after the first deploy.

Optional: **Custom domain** (e.g. `eggspectifi.com`) in the same Networking section; update env vars and Google redirect URI to match.

## 6. Deploy

Each push to the connected branch triggers a deploy. Manual: **Deploy** → **Redeploy**.

Build steps (Docker):

1. `npm ci` + `npm run build -w client` (with `VITE_STRIPE_PUBLISHABLE_KEY`)
2. Production image runs `npm run start -w server`
3. Server serves `/api/*` and static files from `client/dist`

## 7. Verify

- `https://YOUR-DOMAIN/api/health` → `{"ok":true,"service":"retirement-calculator-api"}`
- `https://YOUR-DOMAIN/` → calculator UI
- Register / login, CSV import, manual balances

Logs: service → **Deployments** → latest → **View logs**.

## Hobby plan notes

- One project can include **web + MySQL**; both count toward usage.
- Sleep/cold start: first request after idle may be slow; health check uses `/api/health`.
- Keep secrets only in Railway variables, never in git.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on client | Check build logs; ensure `VITE_*` is available at build if Stripe UI is required |
| 502 / crash on start | Logs: MySQL not linked or wrong `MYSQL_*`; verify MySQL service is running |
| Login / cookies fail | `CLIENT_ORIGIN` must exactly match browser URL (`https://…`) |
| Google redirect error | Redirect URI = `API_PUBLIC_URL` + `/api/auth/google/callback` |
| Blank page, API works | Rebuild — `client/dist` missing in image |
| Old UI | Hard refresh; confirm latest deployment succeeded |

## Local Docker test (optional)

```bash
docker build -t rc-app --build-arg VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxx .
docker run --rm -p 3001:3001 \
  -e NODE_ENV=production \
  -e JWT_SECRET=local-dev-secret-at-least-32-chars-long \
  -e CLIENT_ORIGIN=http://localhost:3001 \
  -e API_PUBLIC_URL=http://localhost:3001 \
  -e MYSQL_HOST=host.docker.internal \
  … \
  rc-app
```

Open http://localhost:3001 (MySQL must be reachable separately).
