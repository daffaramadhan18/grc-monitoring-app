# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About

RSM CC3 — internal web app for the IT GRC & Cybersecurity division to track opportunities, active projects, and team allocation. Replaces Excel-based monitoring.

## Commands

```bash
npm run dev          # Start dev server → http://localhost:3000
npx tsc --noEmit     # Type-check (use this, NOT npm run build)
npm run lint         # ESLint
npx prisma db push   # Apply schema changes (no migration files used)
npx prisma db seed   # Seed service types, sub-services, 14 team members
```

## Development Rules

### Verification
- Always run `npx tsc --noEmit` to check errors, NOT `npm run build`
- Run `git status` and `git log --oneline -5` before any task

### Git
- Push to `origin/main`
- If git push fails, report the error and stop — do not retry more than once

### Scope
- Do not modify files outside the scope of the task
- Do not create files unless explicitly asked

### Deployment
- EC2 deploys from `main` via GitHub Actions (`.github/workflows/deploy.yml`)
- Never SSH to EC2 unless explicitly asked

### Stop Conditions
- If TypeScript is clean and build errors are environment-related (DB, network), stop and report
- Do not spiral into alternative fixes without reporting first

## Architecture

Next.js 14 App Router, TypeScript, Tailwind CSS, Prisma 5 + PostgreSQL.

### Key patterns

- **API routes** live in `src/app/api/` — each module has `route.ts` (list/create), `[id]/route.ts` (update/delete), plus `export/`, `import/`, and `template/` sub-routes for Excel.
- **Page components** follow a server page → `*Client.tsx` client component split (e.g. `projects/page.tsx` → `ProjectsClient.tsx`).
- **BigInt fields** (`harga`, `confirmedFee`, `fee`) must be serialized via `src/lib/serialize.ts` before any JSON response — never return raw Prisma objects.
- **Win → Project auto-creation**: `PUT /api/opportunities/[id]` automatically creates a linked `Project` record when status changes to `Win`.
- **Termins** are replaced wholesale via `PUT /api/projects/[id]/termins` (delete-all + re-insert), not updated individually.
- **PDF uploads** are stored in `public/uploads/` with a timestamp prefix; `public/uploads/.gitkeep` is committed but PDFs are gitignored.

### Shared constants

All status enums, color maps, and formatters live in `src/lib/utils.ts`:
- `OPP_STATUSES`, `OPP_STATUS_COLORS`
- `PROJ_STATUSES`, `PROJ_STATUS_COLORS`
- `TERMIN_STATUSES`, `TERMIN_STATUS_COLORS`
- `formatRupiah`, `formatDate`, `toInputDate`, `capacityBadge`

### Types

`src/types/index.ts` holds all shared TypeScript interfaces. Note: the Prisma schema uses camelCase field names, but the frontend types use snake_case — API routes handle the mapping.

## Database

```
DATABASE_URL="postgresql://admin:admin@localhost:5432/rsm_grc"
```

After any schema change: `npx prisma db push` (no migration files are generated or used).
