# Expectifi

**Plan retirement income — then find where it goes furthest.**

Expectifi is a multi-tenant SaaS retirement income calculator. Model portfolio growth and withdrawal strategies across taxable, pre-tax, Roth, and HSA accounts, then connect projected income to a global **Where to Retire** map that ranks 870+ cities by real surplus after taxes and cost of living.

Live at [expectifi.com](https://expectifi.com).

---

## Features

### Portfolio & income

- Manual account entry and CSV import (Fidelity, Vanguard, Schwab)
- Growth projections with per-account and per-holding scenarios
- Income phase: dividends, withdrawal rate, or blended strategies
- Tax breakdown at retirement (federal brackets loaded from admin-managed constants)
- Social Security timing and spouse eligibility from DOBs
- Runway projections and withdrawal-order guidance
- One-time events (IPO, inheritance, sale)

### Where to Retire

- 870 cities across 135 countries
- Cost of living, healthcare, climate, air quality, and expat community data
- Local tax treatment on foreign pension income
- Live connection to calculator income — cities update as you change inputs

### Accounts & plans

- Free tier: full calculator in the browser, no signup required
- Premium: saved scenarios, cross-device sync, Plaid bank linking
- Google Sign-In and Stripe subscription billing

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, TypeScript, React Query |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (auth, user data, tax constants) |
| Shared logic | Pure TypeScript in `shared/` and `client/src/lib/calc/` |
| Styling | Plain CSS custom properties (design tokens) |
| Icons | Tabler Icons |

Monorepo workspaces: `client`, `server`, `shared`.

---

## Project structure

```
├── client/          React app (calculator UI, maps, onboarding)
├── server/          Express API (auth, billing, Plaid, plan sync)
├── shared/          Types and logic shared across client and server
└── scripts/         Dev helpers, deploy, data refresh jobs
```

Financial calculation logic lives in pure functions under `client/src/lib/calc/` — not in components or API routes.

---

## Getting started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (local or hosted)
- **npm** (workspaces)

### Install

```bash
git clone https://github.com/bchalker/Expectifi.git
cd Expectifi
npm install
```

### Environment

Copy the server env template and fill in values:

```bash
cp server/.env.example server/.env
```

Minimum for local dev:

| Variable | Purpose |
|----------|---------|
| `JWT_SECRET` | Session signing (32+ random characters) |
| `DATABASE_URL` or `PGHOST` / `PGPORT` / `PGUSER` / `PGPASSWORD` / `PGDATABASE` | PostgreSQL connection |
| `CLIENT_ORIGIN` | Vite origin for CORS and cookies (default `http://localhost:5173`) |
| `API_PUBLIC_URL` | Public API base URL (default `http://localhost:3001`) |

See `server/.env.example` for optional integrations: Google OAuth, Stripe, Plaid, Wise, SMTP.

The server runs `ensureSchema()` in `server/db.ts` on startup — that is the schema source of truth (tables are created and migrated in code).

### Run locally

In two terminals:

```bash
# Terminal 1 — API (port 3001)
npm run dev:server

# Terminal 2 — Vite (port 5173)
npm run dev:client
```

Or both at once:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Client + server in parallel |
| `npm run dev:client` | Vite dev server only |
| `npm run dev:server` | Express API with hot reload |
| `npm run build` | Production client build |
| `npm run start` | Start production server (serves built client) |
| `npm run seed:test-promo -w server` | Seed Stripe test promo code |
| `npm test -w client` | Client unit tests (Vitest) |

---

## Optional integrations

Configure in `server/.env` as needed:

- **Stripe** — premium subscriptions and webhooks
- **Google OAuth** — sign-in; callback path is `/api/auth/google/callback`
- **Plaid** — linked brokerage and investment accounts
- **Wise** — live exchange rates for Where to Retire (public rates work without credentials)
- **SMTP** — contact form delivery

Never commit `server/.env`. Example files only.

---

## Deployment

Production runs the Express server, which serves the built client from `client/dist`. Set environment variables on your host:

- `DATABASE_URL`, `JWT_SECRET`, `CLIENT_ORIGIN`, `API_PUBLIC_URL`
- Stripe, Google, and Plaid keys as required

---

## Architecture notes

- **Multi-tenant:** all user data is scoped by `user_id`; no global personal financial state.
- **Configurable per user:** balances, retirement age, SS benefits, dividend yield, withdrawal rate, filing status, currency, and more.
- **Admin-managed constants:** tax brackets, standard deductions, and SS thresholds come from the database — not hardcoded in the app.
- **Plan gating:** features are gated via a `usePlan()` hook; plan checks are not scattered in components.

---

## Contributing

This repository is public for transparency. Issues and pull requests are welcome. Please do not commit secrets, personal financial data, or production credentials.

---

## License

All rights reserved unless otherwise noted.
