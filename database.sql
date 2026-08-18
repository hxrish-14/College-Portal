-- =========================================================
-- STUDENT PORTAL — DATABASE SCHEMA
-- PostgreSQL / Supabase
--
-- Safe to run against an existing project: every statement
-- uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it will
-- not touch data that already exists.
-- =========================================================

-- ---------------------------------------------------------
-- 1. EXTENSIONS
-- ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------

create table if not exists public.students (
    id              uuid primary key default gen_random_uuid(),
    regno           text not null unique,
    name            text not null,
    dob             date not null,
    department      text,
    batch           text,
    year            text,
    gender          text,
    email           text,
    phone           text,
    blood_group     text,
    address         text,
    father_name     text,
    mother_name     text,
    parent_phone    text,
    guardian        text,
    attendance      text,
    photo           text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists public.results (
    id              uuid primary key default gen_random_uuid(),
    regno           text not null references public.students(regno) on update cascade,
    semester        integer not null check (semester between 1 and 12),
    subject_code    text not null,
    subject_name    text not null,
    internal        numeric(5,2) default 0,
    external        numeric(5,2) default 0,
    total           numeric(5,2) generated always as (coalesce(internal,0) + coalesce(external,0)) stored,
    grade           text,
    grade_point     numeric(4,2) default 0,
    credits         numeric(4,2),
    result          text not null default 'PASS' check (result in ('PASS','FAIL')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Columns added after the initial release land here, guarded
-- so re-running this file never fails or drops data.
alter table public.students add column if not exists attendance text;
alter table public.students add column if not exists photo text;
alter table public.results  add column if not exists credits numeric(4,2);

-- ---------------------------------------------------------
-- 3. INDEXES
-- ---------------------------------------------------------
create index if not exists idx_students_regno       on public.students (regno);
create index if not exists idx_students_dob          on public.students (dob);
create index if not exists idx_results_regno         on public.results (regno);
create index if not exists idx_results_regno_sem     on public.results (regno, semester);

-- ---------------------------------------------------------
-- 4. UPDATED_AT TRIGGER
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_students_updated_at on public.students;
create trigger trg_students_updated_at
    before update on public.students
    for each row execute function public.set_updated_at();

drop trigger if exists trg_results_updated_at on public.results;
create trigger trg_results_updated_at
    before update on public.results
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------
-- IMPORTANT — READ BEFORE DEPLOYING
--
-- This portal authenticates a student with Registration Number
-- + Date of Birth from a static, unauthenticated frontend. That
-- is a convenience check, not real authentication: anyone who
-- knows (or guesses) a valid regno + dob pair can pass the login
-- screen, and a static site cannot keep a secret. Supabase RLS
-- policies are evaluated against the anonymous role for every
-- request from this frontend, so they CANNOT be scoped "to the
-- logged-in student" the way they could with real Supabase Auth
-- (auth.uid()) — the anon key has no notion of who is logged in.
--
-- Practical options, in order of preference:
--   1. Best: migrate to Supabase Auth (magic link / OTP to the
--      student's college email) so RLS can use auth.uid() and
--      each student can only ever read their own rows. This is
--      the only option that gives real per-student isolation.
--   2. Acceptable for a classroom/demo deployment: keep the
--      policies below, which allow the anon role to SELECT from
--      both tables. The frontend always filters by regno, so a
--      well-behaved client only ever shows one student's data —
--      but a technically savvy user could query the anon key
--      directly and read every row. Do not put real student PII
--      in a database configured this way.
--   3. Safer middle ground without full Auth: front the reads
--      with a Postgres function (SECURITY DEFINER) or a Supabase
--      Edge Function that takes regno + dob as parameters and
--      returns only that student's rows, then revoke direct
--      table SELECT from anon. Slightly more setup, no schema
--      change required.
--
-- The policies below implement option 2 so the demo works out of
-- the box. Swap them for option 1 or 3 before using real records.

alter table public.students enable row level security;
alter table public.results  enable row level security;

drop policy if exists "students_read_demo" on public.students;
create policy "students_read_demo"
    on public.students
    for select
    to anon
    using (true);

drop policy if exists "results_read_demo" on public.results;
create policy "results_read_demo"
    on public.results
    for select
    to anon
    using (true);

-- No insert / update / delete policies are created for the anon
-- role, so the public key can only ever read — never write.

-- ---------------------------------------------------------
-- 6. DANGER — DEVELOPMENT ONLY
-- ---------------------------------------------------------
-- Never run this section against a database with real student
-- records. It is provided only to let you reset a scratch/dev
-- project back to empty tables.
--
-- truncate public.results, public.students restart identity cascade;

-- ---------------------------------------------------------
-- 7. DEMO DATA — DEVELOPMENT / DEMO DATA ONLY
-- ---------------------------------------------------------
-- Safe to run repeatedly: on conflict does nothing, so it will
-- never overwrite or duplicate a record that already exists.

insert into public.students
    (regno, name, dob, department, batch, year, gender, email, phone, blood_group, address, father_name, mother_name, parent_phone, guardian, attendance)
values
    ('22MCA001', 'Aarav Sharma', '2003-05-15', 'Master of Computer Applications', '2022-2025', 'III Year', 'Male',
     'aarav.sharma@example.edu', '9876543210', 'O+', 'Chennai, Tamil Nadu',
     'Rajesh Sharma', 'Meena Sharma', '9876500000', 'Rajesh Sharma', '96%')
on conflict (regno) do nothing;

insert into public.results
    (regno, semester, subject_code, subject_name, internal, external, grade, grade_point, credits, result)
values
    ('22MCA001', 1, 'MC101', 'Programming Fundamentals', 24, 68, 'O', 10, 4, 'PASS'),
    ('22MCA001', 1, 'MC102', 'Discrete Mathematics',     22, 60, 'A+', 9, 4, 'PASS'),
    ('22MCA001', 1, 'MC103', 'Digital Logic Design',      20, 58, 'A', 8, 3, 'PASS'),
    ('22MCA001', 2, 'MC201', 'Data Structures',           23, 65, 'O', 10, 4, 'PASS'),
    ('22MCA001', 2, 'MC202', 'Database Systems',          21, 62, 'A+', 9, 4, 'PASS'),
    ('22MCA001', 2, 'MC203', 'Computer Networks',         18, 48, 'B+', 7, 3, 'PASS')
on conflict do nothing;

-- =========================================================
-- END OF FILE
-- =========================================================
