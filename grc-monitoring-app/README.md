# RSM CC3 — GRC Monitoring App

Internal web app for RSM CC3 (IT GRC & Cybersecurity division).  
Replaces Excel-based pipeline and project monitoring.

## Modules

| Module | Description |
|---|---|
| **Dashboard** | Win rate, revenue pipeline, team workload |
| **Opportunity Tracker** | Pipeline CRM with 10 statuses |
| **Project Management** | Active projects, SPK/PKS, termin payments, team hours |

---

## First-Time Setup (Windows)

Follow every step in order. You only do this once.

### Step 1 — Install prerequisites

Download and install:
- **Node.js 20 LTS**: https://nodejs.org/en/download (choose "Windows Installer")
- **Git**: https://git-scm.com/download/win

After installing, open a new **Command Prompt** (Win+R → `cmd`) and verify:
```
node -v
npm -v
git --version
```
All three should print a version number.

---

### Step 2 — Clone the repository

```cmd
cd C:\Users\YourName\Documents
git clone https://github.com/daffaramadhan18/daffa-ramadhan.git
cd daffa-ramadhan\grc-monitoring-app
```

---

### Step 3 — Install dependencies

Inside the `grc-monitoring-app` folder:
```cmd
npm install
```
This downloads all packages (~2-3 minutes, requires internet).

---

### Step 4 — Create your Supabase project

1. Go to https://supabase.com and sign up (free)
2. Click **"New Project"**
   - Organization: create one or use personal
   - Name: `rsm-cc3-grc`
   - Database Password: choose a strong password and **save it**
   - Region: pick the closest (e.g. Singapore)
3. Wait ~2 minutes for the project to be ready
4. Go to **Project Settings → API**
   - Copy **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - Copy **anon / public** key (long string starting with `eyJ...`)
   - Copy **service_role** key (another long `eyJ...` string — keep this secret!)

---

### Step 5 — Configure environment variables

In the `grc-monitoring-app` folder, create a file named `.env.local` (exact name, no other extension):

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your_anon_key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your_service_role_key...
```

Replace the values with what you copied in Step 4.

> **Windows tip**: Open Notepad, paste the content, then File → Save As → change "Save as type" to "All Files" → name it `.env.local`

---

### Step 6 — Run the database migration

1. Go to your Supabase project → **SQL Editor** → **New Query**
2. Open the file `supabase/migrations/001_initial_schema.sql` in Notepad
3. Select all (Ctrl+A), copy, paste into the SQL Editor
4. Click **Run**  — you should see "Success. No rows returned"
5. Repeat with `supabase/migrations/002_seed_data.sql`

This creates all tables, indexes, and RLS policies.

---

### Step 7 — Start the development server

```cmd
npm run dev
```

Open your browser at: **http://localhost:3000**

You should see the RSM CC3 dashboard.

---

## Import data from Excel

If you have existing data in an Excel file:

### Prepare your Excel file

Name the file `pipeline.xlsx` and place it at:
```
grc-monitoring-app\scripts\data\pipeline.xlsx
```
(Create the `data` folder if it doesn't exist.)

Your Excel should have sheets named:
- `Opportunities` — with columns: Title, Client, Status, Service, Sub Service, Value, Submitted Date, PIC, Notes
- `Projects` — with columns: Project Name, Client, SPK Number, PKS Number, Start Date, End Date, Total Value, Status, Termin 1 Fee, Termin 1 Paid, Termin 2 Fee, Termin 2 Paid, Termin 3 Fee, Termin 3 Paid, Termin 4 Fee, Termin 4 Paid

Column names are flexible — the script tries common Indonesian/English variants.

### Run the import

Make sure `.env.local` is set up, then:
```cmd
node scripts/import-excel.js
```

The script is safe to re-run — it won't create duplicate clients or team members.

---

## Development commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server at http://localhost:3000 |
| `npm run build` | Build production bundle |
| `npm run lint` | Check code for errors |
| `node scripts/import-excel.js` | Import from Excel |

---

## Project structure

```
grc-monitoring-app/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Dashboard page + charts
│   │   ├── opportunities/      # List, detail pages
│   │   ├── projects/           # List, detail pages
│   │   └── api/                # REST API routes
│   ├── components/
│   │   └── layout/             # Sidebar, Header
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client
│   │   └── utils.ts            # Formatting helpers
│   └── types/
│       └── index.ts            # TypeScript interfaces
├── supabase/
│   └── migrations/             # SQL schema files
└── scripts/
    └── import-excel.js         # Data import script
```

---

## Tech stack

- **Next.js 14** (App Router) — React framework
- **Supabase** — PostgreSQL database + API (free tier)
- **Tailwind CSS** — styling
- **Recharts** — dashboard charts
- **TypeScript** — type safety
