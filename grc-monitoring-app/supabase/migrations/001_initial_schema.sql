-- ============================================================
-- RSM CC3 GRC Monitoring App — Initial Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── clients ──────────────────────────────────────────────────────────────────
create table clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  industry      text,
  contact_person text,
  contact_email  text,
  contact_phone  text,
  created_at    timestamptz not null default now()
);

-- ─── service_types ────────────────────────────────────────────────────────────
create table service_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text
);

-- ─── sub_services ─────────────────────────────────────────────────────────────
create table sub_services (
  id              uuid primary key default gen_random_uuid(),
  service_type_id uuid not null references service_types(id) on delete cascade,
  name            text not null,
  description     text
);

-- ─── team_members ─────────────────────────────────────────────────────────────
create type team_role as enum ('Manager', 'Senior', 'Staff', 'Admin');

create table team_members (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  email     text not null unique,
  role      team_role not null default 'Staff',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─── opportunities ────────────────────────────────────────────────────────────
create type opportunity_status as enum (
  'Submitted',
  'Win',
  'Lose',
  'Waiting for Result',
  'Waiting for RFP',
  'Backlog',
  'Withdraw',
  'Cancelled',
  'Transferred',
  'In Progress'
);

create table opportunities (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  client_id       uuid not null references clients(id) on delete restrict,
  service_type_id uuid references service_types(id) on delete set null,
  sub_service_id  uuid references sub_services(id) on delete set null,
  status          opportunity_status not null default 'Submitted',
  submitted_date  date,
  value_idr       bigint,           -- in full IDR (e.g. 150000000 = Rp 150 juta)
  pic_id          uuid references team_members(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_updated_at
  before update on opportunities
  for each row execute function set_updated_at();

-- ─── projects ─────────────────────────────────────────────────────────────────
create type project_status as enum ('Active', 'Completed', 'On Hold', 'Cancelled');

create table projects (
  id              uuid primary key default gen_random_uuid(),
  opportunity_id  uuid references opportunities(id) on delete set null,
  client_id       uuid not null references clients(id) on delete restrict,
  name            text not null,
  spk_number      text,            -- Surat Perintah Kerja
  pks_number      text,            -- Perjanjian Kerjasama
  start_date      date,
  end_date        date,
  total_value_idr bigint,
  status          project_status not null default 'Active',
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

-- ─── project_team_members ─────────────────────────────────────────────────────
create table project_team_members (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references projects(id) on delete cascade,
  team_member_id   uuid not null references team_members(id) on delete cascade,
  role_in_project  text,
  hours_allocated  numeric(8,2) default 0,
  hours_current    numeric(8,2) default 0,
  unique (project_id, team_member_id)
);

-- ─── termins (payment milestones) ─────────────────────────────────────────────
create table termins (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references projects(id) on delete cascade,
  termin_number  smallint not null check (termin_number between 1 and 4),
  description    text,
  fee_idr        bigint,
  is_paid        boolean not null default false,
  due_date       date,
  paid_date      date,
  unique (project_id, termin_number)
);

-- ─── Row Level Security (basic — open for internal use) ───────────────────────
-- For an internal tool with no auth requirement, we keep RLS simple.
-- Uncomment and tighten these if you add Supabase Auth later.

alter table clients             enable row level security;
alter table service_types       enable row level security;
alter table sub_services        enable row level security;
alter table team_members        enable row level security;
alter table opportunities       enable row level security;
alter table projects            enable row level security;
alter table project_team_members enable row level security;
alter table termins             enable row level security;

-- Allow all operations from anon key (internal app, no public exposure)
create policy "allow_all_clients"              on clients              for all using (true) with check (true);
create policy "allow_all_service_types"        on service_types        for all using (true) with check (true);
create policy "allow_all_sub_services"         on sub_services         for all using (true) with check (true);
create policy "allow_all_team_members"         on team_members         for all using (true) with check (true);
create policy "allow_all_opportunities"        on opportunities        for all using (true) with check (true);
create policy "allow_all_projects"             on projects             for all using (true) with check (true);
create policy "allow_all_project_team_members" on project_team_members for all using (true) with check (true);
create policy "allow_all_termins"              on termins              for all using (true) with check (true);

-- ─── Indexes for common queries ───────────────────────────────────────────────
create index idx_opportunities_status     on opportunities(status);
create index idx_opportunities_client     on opportunities(client_id);
create index idx_opportunities_pic        on opportunities(pic_id);
create index idx_projects_status          on projects(status);
create index idx_projects_client          on projects(client_id);
create index idx_project_team_member_proj on project_team_members(project_id);
create index idx_project_team_member_tm   on project_team_members(team_member_id);
create index idx_termins_project          on termins(project_id);
