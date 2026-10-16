-- Chap Connect — Message Board & Email Relay persistence
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- After this runs, message board posts and email relay logs persist in Supabase.

-- 1. Message Board Posts ----------------------------------------------------
create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Alumni Magazine',
  summary text,
  content text not null,
  author text not null default 'Eanes Alumni Office',
  date text,
  link_url text,
  image_url text,
  pinned boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists board_posts_created_at_idx on public.board_posts (created_at desc);

-- 2. Email Relay Messages ---------------------------------------------------
create table if not exists public.relay_messages (
  id text primary key,
  sender_id text not null,
  sender_name text,
  sender_email text,
  recipient_id text not null,
  recipient_name text,
  recipient_email text,
  obscured_email text,
  subject text,
  body text,
  status text not null default 'delivered',
  reply_status text not null default 'pending',
  reply_text text,
  replied_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists relay_messages_sender_idx on public.relay_messages (sender_id);
create index if not exists relay_messages_recipient_idx on public.relay_messages (recipient_id);

-- 3. Grants + Permissive Prototype Policies ----------------------------------
grant all on public.board_posts to anon, authenticated;
grant all on public.relay_messages to anon, authenticated;

alter table public.board_posts enable row level security;
alter table public.relay_messages enable row level security;

drop policy if exists "board posts access" on public.board_posts;
create policy "board posts access" on public.board_posts for all to anon, authenticated using (true) with check (true);

drop policy if exists "relay messages access" on public.relay_messages;
create policy "relay messages access" on public.relay_messages for all to anon, authenticated using (true) with check (true);
