# Deploy to Railway (Hobby plan)

One **web service** runs the Express API and serves the built React app from the same URL (`/api` works without a separate proxy).

## Architecture

| Railway resource            | Purpose                                           |
| --------------------------- | ------------------------------------------------- |
| **Web service** (this repo) | Docker build → `client/dist` + Node API on `PORT` |
| **PostgreSQL** (plugin)     | Users, scenarios; linked via `DATABASE_URL`       |

## 1. Push code to GitHub

Commit and push `main` (includes `Dockerfile`, `railway.toml`, Postgres in `server/`).

## 2. Create the Railway project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**.
2. Select your repository.

## 3. Add PostgreSQL

1. Project → **+ New** → **Database** → **PostgreSQL**.
2. Open the **web service** → **Variables** → **Add variable reference** (or **Connect** Postgres to the service).
3. Railway injects **`DATABASE_URL`** — the app uses it automatically.

Schema is created on boot (`ensureSchema` in `server/db.ts`).

## 4. Web service variables

| Variable                                    | Value                                                             |
| ------------------------------------------- | ----------------------------------------------------------------- |
| `NODE_ENV`                                  | `production`                                                      |
| `JWT_SECRET`                                | Long random string (≥32 chars)                                    |
| `CLIENT_ORIGIN`                             | `https://your-app.up.railway.app` (no trailing slash)             |
| `API_PUBLIC_URL`                            | Same as `CLIENT_ORIGIN`                                           |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional                                                          |
| `STRIPE_SECRET_KEY`                         | Optional                                                          |
| `VITE_STRIPE_PUBLISHABLE_KEY`               | Enable **Available at build** for Docker build                    |
| `SMTP_HOST`                                 | Mail provider hostname (e.g. `smtp.gmail.com`)                    |
| `SMTP_PORT`                                 | Usually `587` (STARTTLS) or `465` (SSL)                           |
| `SMTP_USER`                                 | SMTP login / sender mailbox                                       |
| `SMTP_PASS`                                 | SMTP password or app password                                     |
| `SMTP_FROM`                                 | `Expectifi <noreply@expectifi.com>` (must be allowed by provider) |
| `CONTACT_TO`                                | Inbox for form notifications (e.g. `you+expectifi@gmail.com`)       |

Contact form posts to `/api/contact`. Set `CONTACT_TO` to the inbox that should receive submissions (use a Gmail `+alias` if SMTP sends from the same account). Without all `SMTP_*` vars the route returns 503.

Do **not** set `USE_STAGING_DB` in production.

`PORT` and `DATABASE_URL` are provided by Railway.

### Google OAuth

Authorized redirect URI:

```text
https://YOUR-DOMAIN/api/auth/google/callback
```

## 5. Public URL

1. Web service → **Settings** → **Networking** → **Generate Domain**.
2. Set `CLIENT_ORIGIN` and `API_PUBLIC_URL` to that HTTPS URL.
3. **Redeploy**.

## 6. Verify

- `https://YOUR-DOMAIN/api/health`
- `https://YOUR-DOMAIN/` — calculator UI
- Register / login / scenarios

### Plaid (US & Canada bank connect)

Set `PLAID_CLIENT_ID`, `PLAID_SECRET`, and `PLAID_ENV` on the web service. Bank linking via Plaid is available for United States and Canadian users on premium accounts.

## Troubleshooting

| Issue               | Fix                                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Build fails         | Build logs; `VITE_STRIPE_PUBLISHABLE_KEY` at build time if needed                                  |
| 502 on start        | Logs: link Postgres; check `DATABASE_URL`                                                          |
| Auth cookies fail   | `CLIENT_ORIGIN` must match browser URL exactly                                                     |
| SSL / DB connection | App enables SSL for Railway URLs automatically                                                     |
| Contact form error  | Set all `SMTP_*` vars; use port 587 + app password for Gmail/Workspace; check logs for `[contact] SMTP send failed` |

## Migrating from MySQL

If you had data in MySQL, export `users` and `scenarios` and import into Postgres (column types: `onboarding_done` is `BOOLEAN`, `inputs` is `JSONB`). Fresh deploys need no migration.
