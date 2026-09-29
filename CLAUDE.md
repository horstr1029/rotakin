# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Rotakin v3** — a CCTV compliance audit webapp (Next.js 16 / React 19 / TypeScript). Audits cameras against SANS 10222-5-1-4 / BS EN 50132-7 standards.

Audit data and image processing are **client-side** (IndexedDB, Canvas, WebWorkers). The only server-side piece is authentication: admin-managed users in SQLite via next-auth. The original spec is in `rotakin_webapp_plan.html` (it predates the Next.js move; where they differ, the code wins).

`AGENTS.md`: this Next.js version has breaking changes — read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (note `src/proxy.ts` replaces the old middleware convention).

## Build & Run

- **Dev**: `npm run dev` (http://localhost:3000)
- **Build**: `npm run build` (`output: 'standalone'`), then `npm start`
- **Lint**: `npm run lint`
- **Tests**: none yet.
- **Deploy**: PM2 via `ecosystem.config.js` (`/var/www/rotakin`, port 3004).

### Environment variables
| Var | Purpose |
|-----|---------|
| `NEXTAUTH_SECRET` | JWT signing secret (required) |
| `NEXTAUTH_URL` | Public base URL |
| `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD` | Seed admin, used only when the users table is empty (defaults exist in `src/lib/auth-db.ts` — always override in production) |
| `AUTH_DB_PATH` | SQLite file (default `./data/rotakin-auth.db`; `data/` is not gitignored — don't commit it) |

## Architecture

### Layout
- `src/app/` — `page.tsx` (main audit UI), `login/`, `admin/` (user management), `api/auth`, `api/admin/users`
- `src/proxy.ts` — redirects unauthenticated requests to `/login` (public: `/login`, `/api/auth`, `/_next`, manifest, icons)
- `src/components/` — `M1`–`M8` tab modules, plus `CameraSheet`, `CameraCard`, `AnnotationViewer`, `AuditManager`, `FloorPlanCard`, `SignaturePad`, `HelpDialog`; shadcn/ui primitives (base-ui) in `ui/`
- `src/lib/` — `store.ts` (zustand), `storage.ts` (IndexedDB via `idb`), `imagePipeline.ts` + `src/workers/imageWorker.ts`, `pdf.ts`, `exports.ts`, `htmlReport.ts`, `csvImport.ts`, `parseFilename.ts`, `standards.ts`, `types.ts`, `auth.ts`, `auth-db.ts`
- `M2_Placeholder.tsx` is unused leftover code

### Auth
next-auth v4 Credentials provider, JWT sessions (8h). Users live in SQLite (`better-sqlite3`, bcrypt hashes). No public registration; admins create/edit/deactivate users and reset passwords at `/admin`. Roles: `admin`, `user`. `better-sqlite3` and `bcryptjs` are `serverExternalPackages`.

### 8-Tab module structure
| Tab | Purpose |
|-----|---------|
| M1 – Site Setup | Audit metadata, logos, GPS, standard selection |
| M2 – Images | Drag-and-drop folder ingestion, batch queue, auto-assignment, auto-create cameras from filenames |
| M3 – Cameras | Camera inventory, galleries, step results, per-camera Test Record, certificates |
| M4 – Dashboard | KPI cards, level distribution charts (recharts), zone heatmap |
| M5 – Reports | Report templates with preview; PDF/DOCX/CSV/JSON/ZIP/HTML client portal |
| M6 – AI | Ollama (local/remote, separate vision model) + Claude API vision |
| M7 – History | Versioned snapshots, comparison |
| M8 – Settings | Standards editor, AI config, image tuning, theme |

Also: multi-audit management, audit templates, floor plans, bulk operations, signature capture, custom report branding, PWA (`public/manifest.json`), light/dark theme.

### Image processing pipeline (the core innovation)
`File drop → validate → filename parse → normalize → Canvas Sobel edge detection → Rotakin figure detection → %R calculation (figure height ÷ frame height × 100) → confidence score → annotate → auto-populate camera record`

- WebWorker pool (2–4 workers) handles batch processing off the main thread
- Confidence thresholds: ≥70% auto-accept, 40–70% flag for review, <40% require manual entry
- Every measurement stores: raw value, confidence %, bounding box, source (`canvas-analysis` | `ai-verified` | `manual-override`)

### Storage
- **IndexedDB** (`rotakin-v3`, stores `audits`, `history`, `templates`): audit state, audit index, history snapshots, templates, settings. Managed in `src/lib/storage.ts`.
- Bump the IndexedDB version and add an `upgrade` branch when adding a store.
- Show a storage usage indicator (~215 MB for a 30-camera, 4-image audit).

### State management
Single zustand store (`src/lib/store.ts`) holds the audit; persisted to IndexedDB on significant changes (debounced).

### Image filename convention
`[camera-ref]_[step-type].[ext]`  
Step types: `static`, `smear`, `colour`, `face`, `snapshot`  
Unrecognised filenames go to an "Unassigned" tray for manual assignment.

### Report generation
jsPDF + AutoTable (`src/lib/pdf.ts`). Five templates: SANS Full Audit, Executive Summary, Technical Appendix, SAPS Forensic Exhibit, Remediation Action Plan. Also exports DOCX (docx.js), CSV, JSON, ZIP (JSZip), standalone HTML.

### AI integration
- **Ollama** (default): local LLM, no API key needed
- **Claude API**: cloud vision for image verification and report narration
- API keys stored in IndexedDB only — never hardcoded or sent without user-configured proxy
- Prompt templates use placeholders: `{AUDIT_SUMMARY}`, `{CAMERA_LIST}`, `{COMPLIANCE_RATE}`, `{TOP_FINDINGS}`, `{STANDARD_APPLIED}`

## Status

All four original phases (data model/dashboard, image pipeline, reports/history, AI/tablet UI) are implemented, plus auth, multi-audit, certificates, floor plans, PWA and client portal. Known gaps: no automated tests; README/docs were stale.
