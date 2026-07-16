-- Chap Connect — Admin access setup
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
--
-- What it does:
--   1. Adds an `is_admin` flag to user_profiles (defaults to false).
--   2. Adds a SECURITY DEFINER helper so RLS policies can check "is the current user an admin?"
--      without recursing on user_profiles' own policies.
--   3. Lets approved admins read every alumni profile (powers the Admin → Alumni Directory tab).
--   4. Prevents regular users from escalating their own is_admin flag.
--
-- To APPROVE an admin later, run (replace the email):
--   update public.user_profiles set is_admin = true where email = 'someone@example.com';
-- (or match on user_id if you prefer).

-- 1. Column ---------------------------------------------------------------
alter table public.user_profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Admin-check helper (SECURITY DEFINER bypasses RLS to avoid recursion) -
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.is_admin = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 3. Directory access ------------------------------------------------------
--    Alumni and admins can read all alumni profiles (powers the Directory tab).
--    Students never call the directory, but this also gates it at the DB level:
--    only alumni/admins can read other alumni rows.
--    (This is additive to any existing "read own profile" policy.)
create or replace function public.is_alumni()
returns boolean
language sql
security definer
set search_path = public
as $$
  -- "Recent alumni" (recent grads still in undergrad) also get directory access;
  -- only current high-school students are excluded.
  select exists (
    select 1
    from public.user_profiles p
    where p.user_id = auth.uid()
      and p.flow_type in ('post_schooling', 'established', 'recent')
  );
$$;

revoke all on function public.is_alumni() from public;
grant execute on function public.is_alumni() to authenticated;

drop policy if exists "admins read all profiles" on public.user_profiles;
drop policy if exists "alumni and admins read alumni profiles" on public.user_profiles;
create policy "alumni and admins read alumni profiles"
  on public.user_profiles
  for select
  to authenticated
  using (
    post_grad_school = 'ALUMNI_METADATA'
    and (public.is_admin() or public.is_alumni())
  );

-- 4. Prevent self-escalation of is_admin -----------------------------------
--    Assumes you already have an UPDATE policy letting users edit their own row.
--    This trigger blocks any non-admin from changing the is_admin value.
create or replace function public.prevent_is_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    raise exception 'Not authorized to change is_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_is_admin_escalation on public.user_profiles;
create trigger trg_prevent_is_admin_escalation
  before update on public.user_profiles
  for each row execute function public.prevent_is_admin_escalation();
