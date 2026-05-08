# RSM CC3 — GRC Monitoring App

Internal web app for the IT GRC & Cybersecurity division to track opportunities, active projects, and team allocation — replacing Excel-based monitoring.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma 5 |
| Database | PostgreSQL |
| Icons | Lucide React |
| Excel | xlsx |
| Charts | Recharts |

---

## Modules

| Module | Description |
|---|---|
| **Dashboard** | KPI cards (Win Rate, Pipeline Value, Active Projects, Revenue Collected), win rate chart, team workload table |
| **Opportunities** | Pipeline CRM — create/edit/delete, quarterly revenue projection, sort by column, multi-select bulk delete, Excel import/export |
| **Projects** | Engagement tracker — create/edit, SPK/PKS PDF upload, termin payment milestones (up to 4), alokasi hours tracking, Excel import/export |
| **Team** | Member CRUD, resource allocation breakdown (active projects vs proposals), capacity badges (Available / At Capacity / Overloaded) |

---

## Prerequisites

- Node.js 18+
- PostgreSQL (tested on 18.3)
- npm

---

## First-time Setup

```bash
# 1. Install dependencies
cd grc-monitoring-app
npm install

# 2. Create the database
# Open psql as a superuser and run:
CREATE USER admin WITH PASSWORD 'admin';
CREATE DATABASE rsm_grc OWNER admin;

# 3. Check .env — edit credentials if yours differ
#    DATABASE_URL="postgresql://admin:admin@localhost:5432/rsm_grc"

# 4. Push schema to the database
npx prisma db push

# 5. Seed initial data (service types, sub-services, 14 team members)
npx prisma db seed

# 6. Start the dev server
npm run dev
# → http://localhost:3000
```

---

## Daily Usage

```bash
cd grc-monitoring-app
npm run dev
```

---

## Excel Import / Export

Every module with tabular data has **Export** and **Import** buttons in the top-right header.

- **Export** — downloads all current data as `.xlsx`
- **Import** — opens a modal where you can:
  1. Click **Download Template** to get the correct column structure
  2. Fill in your data
  3. Upload the file and click **Import**
  4. A summary shows how many rows were imported and which were skipped (with reasons)

Supported for: Opportunities, Projects (including up to 4 termin rows per project).

---

## File Uploads (SPK / PKS)

- PDF documents are uploaded via the project detail page or the New Project modal
- Files are stored in `public/uploads/` with a timestamp prefix
- Download links appear on the project detail page once a file is attached
- Click the **×** button next to a file to remove it (then save)
- `public/uploads/.gitkeep` is committed; uploaded PDFs are ignored by git

---

## Key Behaviours

- Setting an Opportunity status to **Win** automatically creates a linked Project record
- BigInt fields (`harga`, `confirmedFee`, `fee`) are serialized to Number in all API responses
- After any schema change, run `npx prisma db push` (no migration files are used)
- Service Type is optional on Opportunities — leave blank if not yet determined

---

## Project Structure

```
grc-monitoring-app/
├── prisma/
│   ├── schema.prisma          # DB models
│   └── seed.ts                # Service types, sub-services, team members
├── public/
│   └── uploads/               # Uploaded PDF files (gitignored except .gitkeep)
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── opportunities/ # CRUD + import/export/template
    │   │   ├── projects/      # CRUD + termins + import/export/template
    │   │   ├── team/          # CRUD
    │   │   └── upload/        # PDF upload handler
    │   ├── dashboard/
    │   ├── opportunities/
    │   ├── projects/
    │   │   └── [id]/          # Project detail page
    │   └── team/
    ├── components/
    │   ├── layout/Sidebar.tsx
    │   └── ui/CurrencyInput.tsx
    └── lib/
        ├── prisma.ts          # Prisma singleton
        ├── serialize.ts       # BigInt → Number for JSON responses
        └── utils.ts           # Status constants, color maps, formatters
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/api/opportunities` | List all opportunities |
| POST | `/api/opportunities` | Create opportunity |
| PUT | `/api/opportunities/[id]` | Update; auto-creates Project on Win |
| DELETE | `/api/opportunities/[id]` | Delete |
| GET | `/api/opportunities/export` | Download `.xlsx` |
| POST | `/api/opportunities/import` | Bulk import from `.xlsx` |
| GET | `/api/opportunities/template` | Download blank import template |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/[id]` | Update project |
| PUT | `/api/projects/[id]/termins` | Replace all termins for a project |
| DELETE | `/api/projects/[id]` | Delete project + all termins |
| GET | `/api/projects/export` | Download `.xlsx` |
| POST | `/api/projects/import` | Bulk import from `.xlsx` |
| GET | `/api/projects/template` | Download blank import template |
| GET | `/api/team` | List team members |
| POST | `/api/team` | Create team member |
| PUT | `/api/team/[id]` | Update team member |
| DELETE | `/api/team/[id]` | Delete (blocked if assigned to active records) |
| POST | `/api/upload` | Upload a PDF file; returns `{ path, filename }` |
