-- Light of Life CMS self-registration and admin approval
-- Run this after section-permissions.sql.

create table if not exists public.admin_access_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  display_name text,
  requested_sections text[] not null default '{}',
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create or replace function public.is_admin_direct()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'::public.app_role
      and is_active = true
  );
$$;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.admin_access_requests to authenticated;
grant execute on function public.is_admin_direct() to authenticated;

drop trigger if exists admin_access_requests_set_updated_at on public.admin_access_requests;

create trigger admin_access_requests_set_updated_at
before update on public.admin_access_requests
for each row execute function public.set_updated_at();

alter table public.admin_access_requests enable row level security;

drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
drop policy if exists "profiles_update_self_name_or_admin" on public.profiles;

create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'viewer'::public.app_role
  and is_active = false
);

create policy "profiles_read_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin_direct());

create policy "profiles_update_self_name_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin_direct())
with check (
  public.is_admin_direct()
  or (
    id = auth.uid()
    and role = 'viewer'::public.app_role
    and is_active = false
  )
);

drop policy if exists "admin_access_requests_insert_self" on public.admin_access_requests;
drop policy if exists "admin_access_requests_read_self_or_admin" on public.admin_access_requests;
drop policy if exists "admin_access_requests_update_self_pending" on public.admin_access_requests;
drop policy if exists "admin_access_requests_admin_update" on public.admin_access_requests;

create policy "admin_access_requests_insert_self"
on public.admin_access_requests
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
);

create policy "admin_access_requests_read_self_or_admin"
on public.admin_access_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_direct());

create policy "admin_access_requests_update_self_pending"
on public.admin_access_requests
for update
to authenticated
using (
  user_id = auth.uid()
  and status in ('pending', 'rejected')
)
with check (
  user_id = auth.uid()
  and status = 'pending'
);

create policy "admin_access_requests_admin_update"
on public.admin_access_requests
for update
to authenticated
using (public.is_admin_direct())
with check (public.is_admin_direct());
