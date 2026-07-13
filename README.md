# Finance Tracking

App for tracking finances for personal use — a personal, installable PWA for
tracking savings goals, loans, and portfolio allocation — local-first (data
stays in the browser's IndexedDB, never sent to a server) with a manual JSON
backup/restore flow.

**Live app:** https://ashoklamichhane.github.io/finance-tracking/

## Stack

Vite + React + TypeScript, Tailwind CSS v4, Dexie (IndexedDB), Recharts,
React Router (HashRouter, for GitHub Pages compatibility), Radix UI primitives.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
```

Deploys automatically to GitHub Pages via `.github/workflows/deploy.yml` on
every push to `main`.

## Roadmap

- Manual JSON export/import today (Settings page)
- Google Drive sync (encrypted snapshot)
- One-time import from an existing Google Sheet
- Zerodha Kite Connect integration for live portfolio holdings
