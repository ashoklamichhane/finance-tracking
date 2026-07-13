# Finance Tracking

A personal, installable PWA for tracking savings goals, loans, and portfolio
allocation. Data lives in Firestore, scoped per Google account via Firebase
Authentication and locked down by security rules (`firestore.rules`) so only
you can ever read or write your own data — with real-time sync across devices.

**Live app:** https://ashok-finance-tracking.web.app

## Stack

Vite + React + TypeScript, Tailwind CSS v4, Firebase (Auth + Firestore),
Recharts, React Router, Radix UI primitives. Hosted on Firebase Hosting
(Spark/free tier), project `ashok-finance-tracking` (Firestore in `asia-south1`).

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build   # outputs to dist/
npm run preview # serve the production build locally
npm run deploy  # build + firebase deploy --only hosting,firestore:rules
```

Requires the [Firebase CLI](https://firebase.google.com/docs/cli) logged in
(`firebase login`) with access to the project pinned in `.firebaserc`.

## Roadmap

- Manual JSON export/import (Settings page) — done
- One-time import from an existing Google Sheet
- Zerodha Kite Connect integration for live portfolio holdings (via Cloud Run)
