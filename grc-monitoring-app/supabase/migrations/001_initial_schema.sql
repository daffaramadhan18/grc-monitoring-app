-- ============================================================
-- RSM CC3 GRC Monitoring App — Initial Schema
-- Run this in psql:
--   psql -U admin -d rsm_grc -f 001_initial_schema.sql
-- ============================================================

-- ─── Enums ────────────────────────────────────────────────────────────────────

create type opportunity_fase as enum ('RFI', 'RFP', 'Diskusi Awal');

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

create type opportunity_probability as enum ('High', 'Medium', 'Low');

create type project_status as enum ('Planning', 'Fieldwork', 'Reporting', 'Finish');

create type project_owner_type as enum ('ITGRC-S', 'Non ITGRC-S');

create type termin_status as enum (
  'Unpaid',
  'Invoice Requested',
  'Invoice Sent',
  'Paid'
);

-- ─── service_types ────────────────────────────────────────────────────────────

create table service_types (
  id   serial primary key,
  name text not null unique
);

-- ─── sub_services ─────────────────────────────────────────────────────────────

create table sub_services (
  id              serial primary key,
  name            text not null,
  service_type_id integer not null references service_types(id) on delete cascade
);

-- ─── clients ──────────────────────────────────────────────────────────────────

create table clients (
  id        serial primary key,
  initial   text not null unique,
  full_name text not null
);

-- ─── team_members ─────────────────────────────────────────────────────────────

create table team_members (
  id        serial primary key,
  initial   text not null unique,
  full_name text not null,
  level     text not null  -- SA1, SA2, Manager, dll
);

-- ─── opportunities ────────────────────────────────────────────────────────────

create table opportunities (
  id             serial primary key,
  service_type_id integer references service_types(id) on delete set null,
  sub_service_id  integer references sub_services(id) on delete set null,
  client_id       integer not null references clients(id) on delete restrict,
  proposal_name   text not null,
  fase            opportunity_fase,
  status          opportunity_status not null default 'Submitted',
  probability     opportunity_probability,
  revenue_cf      bigint,        -- confirmed revenue (IDR)
  harga           bigint,        -- proposed price (IDR)
  rr_percentage   numeric(5,2),  -- risk rating %
  expected_date   date,
  submitted_date  date,
  notes           text,
  mic_id          integer references team_members(id) on delete set null,
  tm1_id          integer references team_members(id) on delete set null,
  tm2_id          integer references team_members(id) on delete set null,
  tm3_id          integer references team_members(id) on delete set null,
  tm4_id          integer references team_members(id) on delete set null,
  tm5_id          integer references team_members(id) on delete set null,
  tm6_id          integer references team_members(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── projects ─────────────────────────────────────────────────────────────────

create table projects (
  id              serial primary key,
  opportunity_id  integer references opportunities(id) on delete set null,
  proposal_name   text not null,
  client_id       integer not null references clients(id) on delete restrict,
  project_owner   project_owner_type,
  mic_id          integer references team_members(id) on delete set null,
  tm1_id          integer references team_members(id) on delete set null,
  tm2_id          integer references team_members(id) on delete set null,
  tm3_id          integer references team_members(id) on delete set null,
  tm4_id          integer references team_members(id) on delete set null,
  tm5_id          integer references team_members(id) on delete set null,
  tm6_id          integer references team_members(id) on delete set null,
  started_date    date,
  end_date        date,
  status          project_status not null default 'Planning',
  spk             text,
  pks             text,
  confirmed_fee   bigint,
  alokasi_hours   numeric(8,2) default 0,
  current_hours   numeric(8,2) default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── termins ──────────────────────────────────────────────────────────────────

create table termins (
  id             serial primary key,
  project_id     integer not null references projects(id) on delete cascade,
  termin_number  smallint not null check (termin_number between 1 and 4),
  percentage     numeric(5,2),
  fee            bigint,
  status         termin_status not null default 'Unpaid',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (project_id, termin_number)
);

-- ─── auto updated_at ──────────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger opportunities_updated_at before update on opportunities
  for each row execute function set_updated_at();

create trigger projects_updated_at before update on projects
  for each row execute function set_updated_at();

create trigger termins_updated_at before update on termins
  for each row execute function set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index idx_opp_status      on opportunities(status);
create index idx_opp_client      on opportunities(client_id);
create index idx_opp_mic         on opportunities(mic_id);
create index idx_proj_status     on projects(status);
create index idx_proj_client     on projects(client_id);
create index idx_proj_opp        on projects(opportunity_id);
create index idx_termin_project  on termins(project_id);
