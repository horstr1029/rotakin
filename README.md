# Rotakin v3

CCTV compliance audit app for SANS 10222-5-1-4 / BS EN 50132-7. Built with Next.js 16, React 19, TypeScript, Tailwind and shadcn/ui.

Audit data and image analysis (Rotakin figure detection and %R measurement) run in the browser using IndexedDB, Canvas and WebWorkers. A small server component handles login (next-auth, SQLite users).

## Getting started

```bash
npm install
# create .env.local with the variables below
npm run dev                  # http://localhost:3000
```

Environment variables:

| Var | Purpose |
|-----|---------|
| `NEXTAUTH_SECRET` | JWT signing secret (required) |
| `NEXTAUTH_URL` | Public base URL |
| `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` | Initial admin, seeded on first run only |
| `AUTH_DB_PATH` | SQLite path (default `./data/rotakin-auth.db`) |

Set your own admin credentials before first run. Users are created by admins at `/admin`; there is no public sign-up.

## Scripts

`npm run dev` · `npm run build` · `npm start` · `npm run lint`

## Deployment

Production build is `standalone`. `ecosystem.config.js` runs it under PM2 on port 3004 from `/var/www/rotakin`.

## Features

Eight tabs: Site Setup, Images, Cameras, Dashboard, Reports, AI, History, Settings. Reports export to PDF, DOCX, CSV, JSON, ZIP and an HTML client portal. AI is optional (Ollama or Claude vision).

See `CLAUDE.md` for architecture notes and `rotakin_webapp_plan.html` for the original spec.
