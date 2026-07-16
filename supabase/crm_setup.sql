-- Chap Connect — CRM persistence (donations, notes, tags)
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- After this runs, the admin CRM automatically stores donations/notes/tags in
-- Supabase instead of localStorage (the app detects the tables on load).
--
-- NOTE ON SECURITY: this app currently has no real admin authentication (the
-- "Admin Account" button just opens the CRM), and it talks to Supabase with the
-- anon key. To match how the rest of the app already works, these policies allow
-- the anon/authenticated roles full access. This is fine for a prototype but is
-- NOT secure for real donor data — lock it down (real auth + is_admin() policies)
-- before using with live financial information.

-- 1. Donations -------------------------------------------------------------
create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  contact_id   text,                 -- CRM id: 'a-<uuid>' (alumnus) or 'm-<id>' (mentor)
  contact_name text,
  amount       integer not null default 0,
  date         date    not null default current_date,
  campaign     text,
  method       text,
  note         text,
  created_at   timestamptz default now()
);
create index if not exists donations_contact_id_idx on public.donations (contact_id);

-- 2. Notes -----------------------------------------------------------------
create table if not exists public.crm_notes (
  id         uuid primary key default gen_random_uuid(),
  contact_id text not null,
  text       text not null,
  created_at timestamptz default now()
);
create index if not exists crm_notes_contact_id_idx on public.crm_notes (contact_id);

-- 3. Tags (one row per contact, tags as a text[]) --------------------------
create table if not exists public.crm_tags (
  contact_id text primary key,
  tags       text[] not null default '{}'
);

-- 4. Grants + permissive RLS (prototype — see security note above) ---------
grant all on public.donations to anon, authenticated;
grant all on public.crm_notes to anon, authenticated;
grant all on public.crm_tags  to anon, authenticated;

alter table public.donations enable row level security;
alter table public.crm_notes enable row level security;
alter table public.crm_tags  enable row level security;

drop policy if exists "crm donations access" on public.donations;
create policy "crm donations access" on public.donations for all to anon, authenticated using (true) with check (true);

drop policy if exists "crm notes access" on public.crm_notes;
create policy "crm notes access" on public.crm_notes for all to anon, authenticated using (true) with check (true);

drop policy if exists "crm tags access" on public.crm_tags;
create policy "crm tags access" on public.crm_tags for all to anon, authenticated using (true) with check (true);
