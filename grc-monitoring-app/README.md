# RSM CC3 — GRC Monitoring App

> Internal web application for the **IT GRC & Cybersecurity division** to track opportunities (sales pipeline), active projects (engagements), team allocation, and payment milestones — replacing Excel-based monitoring workflows.

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [Prerequisites](#prerequisites)
8. [First-time Setup](#first-time-setup)
9. [Daily Development](#daily-development)
10. [Environment Variables](#environment-variables)
11. [Available Scripts](#available-scripts)
12. [Module Documentation](#module-documentation)
    - [Dashboard](#dashboard)
    - [Opportunities](#opportunities)
    - [Projects](#projects)
    - [Team](#team)
13. [API Reference](#api-reference)
14. [Excel Import / Export](#excel-import--export)
15. [File Uploads (SPK / PKS)](#file-uploads-spk--pks)
16. [Key Behaviours](#key-behaviours)
17. [UI & Styling](#ui--styling)
18. [Security](#security)
19. [Testing](#testing)
20. [Deployment](#deployment)
21. [Development Conventions](#development-conventions)

---

## Overview

RSM CC3 GRC Monitoring App is a full-stack web application built with **Next.js 14 App Router**. It provides a centralised dashboard for the IT GRC & Cybersecurity team to:

- Track the **sales pipeline** from initial proposal to win/loss
- Monitor **active client engagements** with payment termin tracking
- Manage **team member capacity** and project assignments
- Generate **Excel exports** and import bulk data
- Attach **PDF documents** (SPK, PKS) to projects
- View **real-time KPI dashboards** with charts and workload tables

The app is **Progressive Web App (PWA)** enabled, fully responsive on mobile, and designed for internal use with security headers and rate limiting.

---

## Features

### ✅ Dashboard
- Win Rate, Pipeline Value, Active Projects, Revenue Collected KPI cards
- Proposal pipeline win/loss bar chart (Recharts)
- Team workload table — active projects + proposals per member, capacity badges
- Ongoing projects list with end dates
- Quarterly revenue chart (mobile: scrollable cards)
- Optional month-range filter

### ✅ Opportunities (Sales Pipeline CRM)
- Full CRUD for proposals/opportunities
- Sortable columns: Proposal Name, Client, Status, Phase, Expected Date, Price, Revenue CF, Team Lead, Probability, Risk
- Colour-coded status badges (Win, Lose, Waiting for Result, Withdraw, Cancelled, Backlog, etc.)
- Multi-select checkboxes with bulk delete
- Inline edit modal with service type, sub-service, and team member pickers
- Quarterly revenue projection section
- Mobile card view (responsive)
- Excel export / bulk import / template download
- **Auto-creates a linked Project when status is set to Win**

### ✅ Projects (Engagement Tracker)
- Full CRUD for active client projects
- Project detail page with full edit form
- PDF upload support for SPK (Surat Penawaran Kontrak) and PKS (Perjanjian Kerja Sama)
- **Termin payment milestones** — up to 4 termins per project with % allocation, fee amount, and status tracking
- Team member assignment (MIC + up to 6 members)
- Project cloning (`/api/projects/copy`)
- Excel export / bulk import / template download (termins export on separate rows)

### ✅ Team
- Member CRUD — initial (unique), full name, level
- Capacity badges: **Available** / **At Capacity (100%)** / **Overloaded (>100%)**
- Per-member breakdown: active projects + active proposals + finished projects
- Delete blocked if member is assigned to active records

### ✅ Common Platform Features
- Progressive Web App (PWA) — installable on mobile
- Fully responsive design with dedicated mobile bottom nav, top bar, FAB
- Page transitions and Spring animations (Framer Motion)
- BigInt serialisation for all currency fields (stored as PostgreSQL `BIGINT`)
- SWR-powered client-side data fetching with global configuration
- Rate limiting (60 req/min per IP, localhost-exempt)
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy)

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.1.0 |
| Language | TypeScript | 5.3.3 |
| UI Library | React | 18.2.0 |
| Styling | Tailwind CSS | 3.4.1 |
| Animations | Framer Motion | 12.38.0 |
| ORM | Prisma | 5.10.0 |
| Database | PostgreSQL | 18.3+ |
| HTTP Client | SWR | 2.4.1 |
| Icons | Lucide React | 0.321.0 |
| Charts | Recharts | 2.12.0 |
| Excel | xlsx | 0.18.5 |
| UI Primitives | Radix UI (Dialog, Label, Select, Toast) | 1.x |
| Testing | Playwright | 1.60.0 |
| Linting | ESLint (Next.js preset) | 8.56.0 |
| PWA | next-pwa | 5.6.0 |

---

## Architecture

```
                        Browser
                           │
                    Next.js App Router
                   ┌───────┴────────┐
                Server Components  Client Components
              (data fetch on edge)  (SWR + interactivity)
                           │
                   API Routes (src/app/api/)
                           │
                       Prisma ORM
                           │
                       PostgreSQL
```

### Key Architectural Patterns

1. **Server page → Client component split**  
   Each page module has a thin server component (`page.tsx`) that fetches initial data and passes it to a `*Client.tsx` client component which manages interactivity via SWR.

2. **API route structure**  
   Every module follows the same shape:
   - `route.ts` — `GET` (list) + `POST` (create)
   - `[id]/route.ts` — `PUT` (update) + `DELETE`
   - `export/route.ts` — `GET` Excel download
   - `import/route.ts` — `POST` bulk import
   - `template/route.ts` — `GET` blank template
   - `batch/route.ts` — `POST` multi-delete

3. **BigInt serialisation**  
   All fee/price fields are stored as `BIGINT` in PostgreSQL. A custom `serialize()` helper in `src/lib/serialize.ts` converts `BigInt → Number` before any JSON response. Raw Prisma objects are never returned directly.

4. **Win → Project auto-creation**  
   When an Opportunity's status is set to `Win` (via `POST /api/opportunities` or `PUT /api/opportunities/[id]`), the API automatically creates a linked `Project` record if one doesn't already exist.

5. **Termin wholesale replacement**  
   Payment termins are replaced wholesale: `PUT /api/projects/[id]/termins` deletes all existing termins and re-inserts the new set. No individual termin update endpoint exists.

---

## Project Structure

```
grc-monitoring-app/              ← Next.js application root
├── .env.local.example           ← Environment template
├── .eslintrc.json               ← ESLint configuration
├── next.config.js               ← Next.js + PWA configuration
├── tailwind.config.ts           ← Tailwind theme (brand colours)
├── tsconfig.json                ← TypeScript strict config
├── playwright.config.ts         ← E2E test configuration
├── postcss.config.js
│
├── prisma/
│   ├── schema.prisma            ← All DB models
│   ├── seed.ts                  ← Seeds ServiceTypes, SubServices, 14 TeamMembers
│   └── migrations/              ← SQL migration files
│
├── public/
│   ├── logo.svg                 ← Brand logo
│   ├── icon-192.png             ← PWA icon
│   ├── icon-512.png             ← PWA icon
│   ├── manifest.json            ← PWA manifest
│   └── uploads/                 ← PDF file storage (.gitignored except .gitkeep)
│
├── src/
│   ├── types/
│   │   └── index.ts             ← All shared TypeScript interfaces
│   │
│   ├── lib/
│   │   ├── prisma.ts            ← Prisma client singleton (prevents pool exhaustion)
│   │   ├── serialize.ts         ← BigInt → Number JSON serialiser
│   │   ├── utils.ts             ← formatRupiah, formatDate, OPP_STATUSES, PROJ_STATUSES, etc.
│   │   ├── constants.ts         ← Status enums and field definitions
│   │   ├── fetcher.ts           ← SWR fetch wrapper
│   │   ├── parse.ts             ← Date & number parsers (for Excel import)
│   │   └── haptic.ts            ← Mobile haptic feedback helper
│   │
│   ├── components/
│   │   ├── SWRProvider.tsx      ← SWR global config wrapper
│   │   ├── MonthFilter.tsx      ← Dashboard month range filter
│   │   ├── EditOpportunityModal.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      ← Desktop navigation sidebar
│   │   │   ├── BottomNav.tsx    ← Mobile bottom navigation bar
│   │   │   ├── MobileTopbar.tsx ← Mobile top app bar
│   │   │   └── PageTransition.tsx ← Framer Motion page wrapper
│   │   └── ui/
│   │       └── CurrencyInput.tsx ← Formatted currency input (IDR)
│   │
│   └── app/
│       ├── globals.css          ← Global styles, animations, component classes
│       ├── layout.tsx           ← Root layout (SWRProvider, Sidebar/BottomNav)
│       ├── page.tsx             ← Redirects → /dashboard
│       ├── middleware.ts        ← Security headers + rate limiting
│       │
│       ├── dashboard/
│       │   ├── page.tsx
│       │   ├── loading.tsx
│       │   ├── DashboardFilters.tsx
│       │   ├── SummaryCards.tsx
│       │   ├── ProposalPipeline.tsx
│       │   ├── TeamWorkload.tsx
│       │   └── OngoingProjects.tsx
│       │
│       ├── opportunities/
│       │   ├── page.tsx
│       │   ├── loading.tsx
│       │   ├── OpportunitiesClient.tsx   ← Main table + modals (~1270 lines)
│       │   ├── MobileOppCard.tsx
│       │   ├── QuarterlySection.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── OpportunityEditPage.tsx
│       │
│       ├── projects/
│       │   ├── page.tsx
│       │   ├── loading.tsx
│       │   ├── ProjectsClient.tsx        ← Main table + modals (~1273 lines)
│       │   ├── MobileProjCard.tsx
│       │   ├── new/page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── ProjectDetailClient.tsx  ← Edit form + termin management
│       │
│       ├── team/
│       │   ├── page.tsx
│       │   ├── loading.tsx
│       │   ├── TeamClient.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── TeamMemberClient.tsx
│       │
│       └── api/
│           ├── opportunities/
│           │   ├── route.ts              ← GET list / POST create
│           │   ├── [id]/route.ts         ← PUT update / DELETE
│           │   ├── export/route.ts       ← GET .xlsx download
│           │   ├── import/route.ts       ← POST bulk import
│           │   ├── template/route.ts     ← GET blank template
│           │   └── batch/route.ts        ← POST multi-delete
│           ├── projects/
│           │   ├── route.ts
│           │   ├── [id]/route.ts
│           │   ├── [id]/termins/route.ts ← PUT wholesale termin replacement
│           │   ├── export/route.ts
│           │   ├── import/route.ts
│           │   ├── template/route.ts
│           │   ├── batch/route.ts
│           │   └── copy/route.ts         ← POST project clone
│           ├── team/
│           │   ├── route.ts
│           │   └── [id]/route.ts
│           ├── team-members/
│           │   └── route.ts              ← GET all members (dropdown helper)
│           └── upload/
│               └── route.ts             ← POST PDF file upload
│
└── tests/
    └── uat/
        ├── api-team.spec.ts
        ├── api-projects.spec.ts
        ├── api-opportunities.spec.ts
        ├── logic-dashboard.spec.ts
        ├── logic-opportunities.spec.ts
        ├── logic-projects.spec.ts
        ├── logic-team.spec.ts
        ├── security-basic.spec.ts
        ├── state-consistency.spec.ts
        ├── empty-states.spec.ts
        ├── mobile.spec.ts
        └── helpers.ts
```

---

## Database Schema

The database uses **PostgreSQL** managed via **Prisma ORM**. Schema is applied with `npx prisma db push` — no migration files are generated or used in development.

### Models

#### `ServiceType`
| Field | Type | Constraints |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `name` | String | UNIQUE |

Seeded values: `IT GRC`, `Privacy`, `Cybersecurity`

---

#### `SubService`
| Field | Type | Constraints |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `name` | String | — |
| `serviceTypeId` | Int | FK → ServiceType |

Seeded examples: IT Audit & Compliance, LPS-SCV, VAPT, Red Teaming, etc.

---

#### `TeamMember`
| Field | Type | Constraints |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `initial` | String | UNIQUE (e.g. `ALX`, `DSA`, `RON`) |
| `fullName` | String | — |
| `level` | String | e.g. `SM1`, `M3`, `AM1`, `SA1`–`SA3`, `A1`, `I` |

14 members seeded by default.

---

#### `Opportunity`
| Field | Type | Description |
|---|---|---|
| `id` | Int | PK |
| `proposalName` | String | Required |
| `clientName` | String? | — |
| `clientInitial` | String? | Short client identifier |
| `serviceTypeId` | Int? | FK → ServiceType (nullable) |
| `subServiceId` | Int? | FK → SubService (nullable) |
| `phase` | String? | `RFI`, `RFP`, `Diskusi Awal`, `Transferred` |
| `status` | String | `Win`, `Lose`, `Waiting for Result`, `Withdraw`, `Cancelled`, `Backlog`, `Transfer to others`, `In progress`, `Submitted` |
| `probability` | String? | `High`, `Medium`, `Low` |
| `riskLevel` | String? | — |
| `harga` | BigInt? | Proposal price (IDR) |
| `revenueCf` | BigInt? | Revenue carry-forward (IDR) |
| `rrPercentage` | Float? | RR % |
| `expectedDate` | DateTime? | Expected close date |
| `submittedDate` | DateTime? | Proposal submission date |
| `notes` | String? | Free-form notes |
| `micInitial` | String? | MIC (team lead) initial |
| `tm1Initial`–`tm6Initial` | String? | Team member 1–6 initials |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

---

#### `Project`
| Field | Type | Description |
|---|---|---|
| `id` | Int | PK |
| `opportunityId` | Int? | UNIQUE FK → Opportunity (one-to-one) |
| `proposalName` | String | Required |
| `clientName` | String? | — |
| `clientInitial` | String? | — |
| `projectOwner` | String? | `ITGRC-S`, `Non ITGRC-S` |
| `micInitial` | String? | MIC (team lead) |
| `teamMembers` | String[] | Array of member initials |
| `startedDate` | DateTime? | — |
| `endDate` | DateTime? | — |
| `status` | String | `Planning`, `Fieldwork`, `Reporting`, `Finish` |
| `spk` | String? | PDF filename for SPK |
| `pks` | String? | PDF filename for PKS |
| `confirmedFee` | BigInt? | Confirmed engagement fee (IDR) |
| `createdAt` | DateTime | Auto |
| `updatedAt` | DateTime | Auto |

---

#### `Termin` (Payment Milestone)
| Field | Type | Description |
|---|---|---|
| `id` | Int | PK |
| `projectId` | Int | FK → Project (CASCADE DELETE) |
| `terminNumber` | Int | 1–4 |
| `percentage` | Float? | % of total fee |
| `fee` | BigInt? | Termin amount (IDR) |
| `status` | String? | `Deliverables in Progress`, `Invoice Requested`, `Invoice Sent`, `Paid` |
| `createdAt` | DateTime | Auto |

> **Note:** Termins are deleted automatically when their parent Project is deleted (CASCADE).

---

### Entity Relationships

```
ServiceType ──< SubService
ServiceType <── Opportunity ──> SubService
Opportunity ──| Project ──< Termin
TeamMember (referenced by initial strings in Opportunity.micInitial / tmXInitial and Project.teamMembers)
```

---

## Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** (tested on 18.3)
- **npm** (comes with Node.js)

---

## First-time Setup

```bash
# 1. Navigate into the app directory
cd grc-monitoring-app

# 2. Install dependencies
npm install

# 3. Create the PostgreSQL database
#    Open psql as a superuser and run:
CREATE USER admin WITH PASSWORD 'admin';
CREATE DATABASE rsm_grc OWNER admin;

# 4. Configure environment variables
cp .env.local.example .env.local
# Edit .env.local if your DB credentials differ from the defaults

# 5. Push the Prisma schema to the database
npx prisma db push

# 6. Seed initial data (3 service types, 11 sub-services, 14 team members)
npx prisma db seed

# 7. Start the development server
npm run dev
# → http://localhost:3000
```

---

## Daily Development

```bash
npm run dev          # Start dev server on http://localhost:3000
npx tsc --noEmit     # Type-check without building (USE THIS, not npm run build)
npm run lint         # Run ESLint
```

> **Important:** Always use `npx tsc --noEmit` to check types — **not** `npm run build`. The build process requires a live database connection; TypeScript checking does not.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | — | PostgreSQL connection string |

**`.env.local.example`:**
```env
DATABASE_URL=postgresql://admin:admin@localhost:5432/rsm_grc
```

> `NODE_ENV` is set automatically by Next.js. PWA is only enabled in `production`.

---

## Available Scripts

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)

# Type checking
npx tsc --noEmit         # Check TypeScript types (RECOMMENDED over build)

# Building & running production
npm run build            # Production build (requires DB connection)
npm start                # Start production server

# Linting
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint errors

# Database
npx prisma db push       # Apply schema.prisma to DB (no migration files used)
npx prisma db seed       # Seed default service types, sub-services, team members
npx prisma studio        # Open Prisma visual DB editor (if installed globally)

# Testing
npx playwright test      # Run all 12 E2E test suites (UAT)
npx playwright show-report  # Open HTML test report
```

---

## Module Documentation

### Dashboard

**Route:** `/dashboard`

The dashboard is the home screen and provides a high-level KPI overview.

#### KPI Summary Cards
| Card | Metric |
|---|---|
| Win Rate | Win count ÷ (Win + Lose) × 100% |
| Pipeline Value | Sum of `harga` for non-Win opportunities |
| Active Projects | Count of projects in Planning/Fieldwork/Reporting |
| Revenue Collected | Sum of `fee` for Paid termins |
| Total Confirmed Fee | Sum of all projects' `confirmedFee` |
| Pending Revenue | Confirmed Fee − Collected Revenue |

#### Charts & Tables
- **Proposal Pipeline:** Bar chart comparing Win count vs Lose count per month
- **Team Workload:** Table showing each member's active projects + proposals, with capacity badge
- **Ongoing Projects:** List of non-Finished projects with end dates
- **Quarterly Revenue:** Bar chart showing revenue by quarter; mobile shows scrollable cards

#### Month Filter
An optional date range filter available at the top of the dashboard. When set, filters KPI calculations to the selected month range.

---

### Opportunities

**Route:** `/opportunities`

The opportunities module is the sales pipeline CRM for tracking all proposals.

#### Statuses
| Status | Description |
|---|---|
| `Backlog` | Not yet started |
| `In progress` | Actively being worked on |
| `Submitted` | Proposal submitted to client |
| `Waiting for Result` | Awaiting client decision |
| `Win` | Awarded — auto-creates a Project |
| `Lose` | Not awarded |
| `Withdraw` | Withdrawn by RSM |
| `Cancelled` | Cancelled by client |
| `Transfer to others` | Transferred to another team |

#### Fields
- **Proposal Name** — required
- **Client Name / Initial** — client identifier
- **Service Type / Sub-service** — e.g. IT GRC → IT Audit & Compliance
- **Phase** — `RFI`, `RFP`, `Diskusi Awal`, `Transferred`
- **Status** — see above
- **Probability** — `High`, `Medium`, `Low`
- **Risk Level** — free text
- **Harga** — proposal price (IDR, BigInt)
- **Revenue CF** — carry-forward revenue (IDR, BigInt)
- **RR %** — revenue recognition percentage
- **Expected Date / Submitted Date**
- **Notes**
- **MIC Initial** — team lead
- **TM1–TM6** — up to 6 additional team members

#### Operations
- **Create** — via New Opportunity form (`/opportunities/new`)
- **Edit** — inline modal with full field access
- **Delete** — single or bulk (multi-select checkboxes)
- **Sort** — click any column header
- **Export** — download all data as `.xlsx`
- **Import** — bulk import from `.xlsx` (with validation summary)
- **Template** — download blank import template

#### Mobile View
On mobile, the table is replaced by stacked cards showing: proposal name, client, status badge, expected date, price, and team initials.

---

### Projects

**Route:** `/projects` and `/projects/[id]`

The projects module tracks active client engagements.

#### Statuses
| Status | Description |
|---|---|
| `Planning` | Not yet started; setup phase |
| `Fieldwork` | Active on-site or remote delivery |
| `Reporting` | Deliverables and report writing |
| `Finish` | Engagement complete |

#### Fields
- **Proposal Name** — required
- **Client Name / Initial**
- **Project Owner** — `ITGRC-S` or `Non ITGRC-S`
- **MIC Initial** — team lead
- **Team Members** — array of member initials
- **Start Date / End Date**
- **Status**
- **SPK** — PDF filename (Surat Penawaran Kontrak)
- **PKS** — PDF filename (Perjanjian Kerja Sama)
- **Confirmed Fee** — engagement fee (IDR, BigInt)

#### Termin Payment Milestones
Each project supports up to **4 termin (payment milestone)** records. Each termin has:
- **Termin Number** (1–4)
- **Percentage** (% of total Confirmed Fee)
- **Fee** (absolute IDR amount — can be entered manually)
- **Status** — `Deliverables in Progress`, `Invoice Requested`, `Invoice Sent`, `Paid`

Termins are managed on the Project detail page and saved together via `PUT /api/projects/[id]/termins` (wholesale replace — all old termins are deleted and the new set is inserted atomically).

#### Operations
- **Create** — via New Project form (`/projects/new`)
- **Edit** — detail page at `/projects/[id]`
- **Delete** — single or bulk
- **Clone** — copy a project via `POST /api/projects/copy`
- **Export** — download as `.xlsx` (termins appear on separate rows under each project)
- **Import** — bulk import from `.xlsx` (up to 4 termin columns per project row)
- **Template** — download blank import template
- **Upload PDF** — SPK/PKS attach on detail page

---

### Team

**Route:** `/team` and `/team/[id]`

The team module manages member records and tracks capacity.

#### Member Fields
- **Initial** — unique 2–3 char identifier (e.g. `ALX`, `DSA`)
- **Full Name**
- **Level** — e.g. `SM1`, `M3`, `AM1`, `SA1`, `SA2`, `SA3`, `A1`, `I`

#### Capacity Badges
| Badge | Condition | Colour |
|---|---|---|
| Available | Active projects < threshold | Green |
| At Capacity | Active projects = threshold | Yellow |
| Overloaded | Active projects > threshold | Red |

#### Operations
- **Create** — new member form (initial must be unique, case-insensitive)
- **Edit** — member detail page
- **Delete** — blocked if the member is assigned to any active opportunities or projects
- **View** — detail page shows active projects, active proposals, finished projects

---

## API Reference

### Opportunities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/opportunities` | List all opportunities with related ServiceType, SubService |
| `POST` | `/api/opportunities` | Create new opportunity; auto-creates Project if status is `Win` |
| `PUT` | `/api/opportunities/[id]` | Update; auto-creates linked Project if status changes to `Win` |
| `DELETE` | `/api/opportunities/[id]` | Delete single opportunity |
| `GET` | `/api/opportunities/export` | Download all data as `.xlsx` |
| `POST` | `/api/opportunities/import` | Bulk import from `.xlsx`; returns `{ imported, skipped, errors }` |
| `GET` | `/api/opportunities/template` | Download blank import template `.xlsx` |
| `POST` | `/api/opportunities/batch` | Bulk delete; body: `{ ids: number[] }` |

### Projects

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects with their termins |
| `POST` | `/api/projects` | Create new project |
| `PUT` | `/api/projects/[id]` | Update project fields |
| `DELETE` | `/api/projects/[id]` | Delete project and cascade-delete all termins |
| `PUT` | `/api/projects/[id]/termins` | Replace ALL termins for a project (delete old, insert new) |
| `GET` | `/api/projects/export` | Download as `.xlsx` (termins on separate rows) |
| `POST` | `/api/projects/import` | Bulk import from `.xlsx` |
| `GET` | `/api/projects/template` | Download blank import template `.xlsx` |
| `POST` | `/api/projects/batch` | Bulk delete; body: `{ ids: number[] }` |
| `POST` | `/api/projects/copy` | Clone a project; body: `{ id: number }` |

### Team

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/team` | List all team members |
| `POST` | `/api/team` | Create team member; initial must be unique |
| `PUT` | `/api/team/[id]` | Update member |
| `DELETE` | `/api/team/[id]` | Delete (returns 400 if member is actively assigned) |
| `GET` | `/api/team-members` | List all members (lightweight, used for dropdowns) |

### Upload

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a PDF; returns `{ path: string, filename: string }` |

**Upload constraints:**
- Max file size: **10 MB**
- Accepted MIME type: `application/pdf`
- Magic byte validation: file must begin with `%PDF` (`25 50 44 46`)
- Filename sanitised: only `[a-zA-Z0-9._-]` allowed
- Stored in `public/uploads/` with a `{timestamp}_{sanitisedName}` prefix

---

## Excel Import / Export

Every module with tabular data has **Export** and **Import** buttons.

### Export
- Downloads all current data as a `.xlsx` file
- Projects: termins appear on separate rows beneath each project row

### Import
1. Click **Download Template** to get a blank `.xlsx` with the correct column headers
2. Fill in your data (follow the column order exactly)
3. Upload the completed file and click **Import**
4. A summary modal appears showing:
   - ✅ Rows imported successfully
   - ⚠️ Rows skipped with specific reasons (e.g. duplicate name, missing required field)

### Template Columns

**Opportunities template columns:**
`Proposal Name`, `Client Name`, `Client Initial`, `Service Type`, `Sub Service`, `Phase`, `Status`, `Probability`, `Risk Level`, `Harga`, `Revenue CF`, `RR %`, `Expected Date`, `Submitted Date`, `Notes`, `MIC`, `TM1`–`TM6`

**Projects template columns:**
`Proposal Name`, `Client Name`, `Client Initial`, `Project Owner`, `MIC`, `Team Members`, `Start Date`, `End Date`, `Status`, `Confirmed Fee`, `Termin1 %`, `Termin1 Fee`, `Termin1 Status`, ... (repeat for Termins 2–4)

---

## File Uploads (SPK / PKS)

- PDF documents are uploaded from the project detail page (`/projects/[id]`)
- Files are stored in `public/uploads/` with a `{timestamp}_{filename}` prefix
- Download links appear on the project detail page once a file is attached
- To remove a file: click **×** next to the filename, then save the project
- `public/uploads/.gitkeep` is committed to preserve the directory; all uploaded PDFs are gitignored

### Security
- File type checked by MIME type AND magic bytes (`%PDF` at start of file)
- Filename is sanitised before storage (strips special characters)
- File size capped at 10 MB

---

## Key Behaviours

| Behaviour | Details |
|---|---|
| **Win → Project auto-creation** | Setting status to `Win` on an Opportunity automatically creates a linked `Project` with the same proposal name and client. If a linked project already exists, no duplicate is created. |
| **BigInt serialisation** | `harga`, `confirmedFee`, `fee`, `revenueCf` are stored as `BIGINT` in PostgreSQL. The `serialize()` helper in `src/lib/serialize.ts` converts them to `Number` in all API responses. Never return raw Prisma objects. |
| **Termin wholesale replace** | `PUT /api/projects/[id]/termins` deletes all existing termins for the project, then inserts the full new set in one transaction. |
| **Schema changes** | After modifying `schema.prisma`, run `npx prisma db push`. No migration files are created. |
| **Service Type optional** | Service Type (and Sub-service) on Opportunities can be left blank when not yet determined. |
| **Team member delete guard** | A team member cannot be deleted if their initial appears in any `micInitial`, `tm1Initial`–`tm6Initial` field on active Opportunities, or in `teamMembers` on active Projects. |
| **Project clone** | `POST /api/projects/copy` creates a new project with all fields copied from the source. Termins are also duplicated. |

---

## UI & Styling

### Brand Colours (Tailwind theme)
| Token | Hex | Usage |
|---|---|---|
| `brand.red` | `#CC0000` | Primary accent, active nav |
| `brand.dark` | `#1A1A2E` | Sidebar background |
| `brand.gray` | `#F5F5F5` | Page background |

### Animations
Custom CSS keyframes defined in `globals.css`:
`fade-in`, `wiggle`, `float`, `pop`, `heartbeat`, `shimmer`, `grow`, `press`, `page-in`, `fab-ping`, and more (14+ total).

Motion tokens include Spring easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`) and Soft easing (`cubic-bezier(0.25, 0.46, 0.45, 0.94)`).

Framer Motion is used for page transitions, sidebar animations, and component entry/exit effects.

### Responsive Design
- **Desktop:** Sidebar navigation (left rail)
- **Mobile:** Bottom navigation bar (64px) + top app bar + FAB (floating action button)
- All data tables have dedicated mobile card views (`MobileOppCard.tsx`, `MobileProjCard.tsx`)
- `prefers-reduced-motion` media query respected in all CSS animations

---

## Security

| Feature | Implementation |
|---|---|
| **Rate limiting** | 60 requests/minute per IP address (in-memory, resets on server restart). Localhost (`127.0.0.1`, `::1`) is exempt. Returns `429 Too Many Requests` when exceeded. |
| **Security headers** | Applied via Next.js middleware on all routes: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy`, `Permissions-Policy` |
| **PDF upload validation** | MIME type check + magic byte validation (`%PDF`) + filename sanitisation + 10 MB size cap |
| **BigInt safety** | All fee fields serialised before response; raw Prisma objects never exposed |

---

## Testing

The app uses **Playwright** for end-to-end (E2E) User Acceptance Testing (UAT).

### Test Suites (12 files in `tests/uat/`)

| File | Coverage |
|---|---|
| `api-opportunities.spec.ts` | Opportunities CRUD API |
| `api-projects.spec.ts` | Projects CRUD + termins API |
| `api-team.spec.ts` | Team CRUD API |
| `logic-dashboard.spec.ts` | Dashboard KPI calculations |
| `logic-opportunities.spec.ts` | Opportunity business logic (Win → Project) |
| `logic-projects.spec.ts` | Project + termin logic |
| `logic-team.spec.ts` | Capacity + assignment logic |
| `security-basic.spec.ts` | Rate limiting, headers, upload validation |
| `state-consistency.spec.ts` | Data consistency across modules |
| `empty-states.spec.ts` | UI empty state handling |
| `mobile.spec.ts` | Mobile responsive layout |
| `helpers.ts` | Shared test utilities |

### Running Tests

```bash
# Run all tests
npx playwright test

# Run a specific suite
npx playwright test tests/uat/api-opportunities.spec.ts

# Open HTML report after run
npx playwright show-report
```

---

## Deployment

Production deployments are handled via **GitHub Actions CI/CD** to an **AWS EC2** instance.

- Workflow file: `.github/workflows/deploy.yml`
- Trigger: push to `main` branch
- Process: SSH to EC2 → pull latest → install deps → rebuild → restart PM2

> **Never SSH directly to EC2** unless explicitly instructed. All deployments go through the GitHub Actions workflow.

### Production Build

```bash
npm run build    # Requires a live DATABASE_URL
npm start        # Starts the production server
```

---

## Development Conventions

### Git
- Branch from `main` for all features
- Push to `origin/main` (or feature branch + PR)
- If `git push` fails, report the error — do not retry more than once

### TypeScript
- Strict mode enabled (`tsconfig.json`)
- Always run `npx tsc --noEmit` before committing
- All shared types go in `src/types/index.ts`
- API routes handle camelCase ↔ snake_case mapping between DB and frontend types

### Constants & Utilities
All status enums, colour maps, and formatters live in `src/lib/utils.ts` and `src/lib/constants.ts`:
- `OPP_STATUSES`, `OPP_STATUS_COLORS`
- `PROJ_STATUSES`, `PROJ_STATUS_COLORS`
- `TERMIN_STATUSES`, `TERMIN_STATUS_COLORS`
- `formatRupiah(n)` — formats a number as IDR currency
- `formatDate(d)` — formats a date for display
- `toInputDate(d)` — formats a date for `<input type="date">`
- `capacityBadge(active, total)` — returns badge label and colour

### API Routes
- Always serialise BigInt fields via `serialize()` before returning JSON
- Validate required fields and return `400` with a descriptive message on failure
- Return `404` when a record is not found
- Return `409` on duplicate constraint violations

### Schema Changes
```bash
# After modifying prisma/schema.prisma:
npx prisma db push

# No migration files are created. For production schema changes,
# coordinate with the team and test locally first.
```

---

## Quick Reference

```bash
# Start dev
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Reset + reseed database
npx prisma db push && npx prisma db seed

# Run E2E tests
npx playwright test
```
