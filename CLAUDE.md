# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Rotakin v3** — a 100% client-side CCTV compliance audit webapp. No backend required. Runs from a single HTML file (or USB stick). Audits cameras against SANS 10222-5-1-4 / BS EN 50132-7 standards.

The full specification lives in `rotakin_webapp_plan.html`. Read it before making architectural decisions.

## Build & Run

No build tool is required. The app is a single HTML file with CDN-loaded libraries.

- **Dev**: Open `rotakin_v3.html` directly in a browser (or `npx serve .` for File System Access API support)
- **Lint**: `npx eslint rotakin_v3.html --ext .html` (if ESLint is added)
- **Tests**: `npx jest` for unit logic; `npx playwright test` for UI flows (if test suites are added)

If the codebase grows past ~3000 lines, switch to Option B (Vite bundle in `rotakin-v3/`): `npx vite dev`.

## Architecture

### Single-file, offline-first
All logic is inline in one HTML file. CDN libraries (jsPDF, Chart.js, docx.js, JSZip, LZString, QRCode.js) are loaded dynamically at runtime. The app is fully functional without internet — AI features are optional add-ons.

### 8-Tab module structure
| Tab | Purpose |
|-----|---------|
| M1 – Site & Report Setup | Audit metadata, logos, GPS, standard selection |
| M2 – Image Importer | Drag-and-drop folder ingestion, batch queue, auto-assignment |
| M3 – Camera Test Records | Camera inventory, multi-image galleries, step results |
| M4 – Dashboard | KPI cards, level distribution charts, zone heatmap |
| M5 – Report Generator | 5 PDF/DOCX templates with live preview |
| M6 – AI Assistant | Ollama (local) + Claude API (cloud/vision) |
| M7 – Audit Trail | Versioned history snapshots, comparison, change tracking |
| M8 – Settings | Standards editor, AI config, image tuning, theme |

### Image processing pipeline (the core innovation)
`File drop → validate → filename parse → normalize → Canvas Sobel edge detection → Rotakin figure detection → %R calculation (figure height ÷ frame height × 100) → confidence score → annotate → auto-populate camera record`

- WebWorker pool (2–4 workers) handles batch processing off the main thread
- Confidence thresholds: ≥70% auto-accept, 40–70% flag for review, <40% require manual entry
- Every measurement stores: raw value, confidence %, bounding box, source (`canvas-analysis` | `ai-verified` | `manual-override`)

### Storage
- **IndexedDB**: audit JSON, thumbnails, annotated images, history snapshots (LZString-compressed), settings
- **File System Access API**: full-resolution originals (user-granted folder)
- Keys: `rotakin-audit-{auditId}`, `rotakin-history-{auditId}`, `rotakin-settings`
- Storage budget: ~215 MB for a 30-camera audit with 4 images each (base64 overhead) — show usage indicator

### State management
Single global audit object in memory, persisted to IndexedDB on every significant change (debounced). Tab switching loads/caches module state from that object.

### Image filename convention
`[camera-ref]_[step-type].[ext]`  
Step types: `static`, `smear`, `colour`, `face`, `snapshot`  
Unrecognised filenames go to an "Unassigned" tray for manual assignment.

### Report generation
jsPDF + AutoTable. Five templates: SANS Full Audit, Executive Summary, Technical Appendix, SAPS Forensic Exhibit, Remediation Action Plan. Also exports DOCX (docx.js), CSV, JSON, ZIP (JSZip), standalone HTML.

### AI integration
- **Ollama** (default): local LLM, no API key needed
- **Claude API**: cloud vision for image verification and report narration
- API keys stored in IndexedDB only — never hardcoded or sent without user-configured proxy
- Prompt templates use placeholders: `{AUDIT_SUMMARY}`, `{CAMERA_LIST}`, `{COMPLIANCE_RATE}`, `{TOP_FINDINGS}`, `{STANDARD_APPLIED}`

## Development Phases

1. **Phase 1** — Migrate v2 functionality, jsPDF engine, multi-image gallery, CSV import, Chart.js dashboard
2. **Phase 2** — Folder drag-and-drop, image queue UI, Canvas Rotakin detection, %R calc, WebWorker threading, auto-populate
3. **Phase 3** — Annotation overlay, zoom/pan viewer, all 5 report templates, DOCX/ZIP export, audit history
4. **Phase 4** — Claude API vision, anomaly detection, face recognition, pre-processing controls, responsive tablet UI

Always implement phases in order — Phase 2 depends on Phase 1's data model being stable.
