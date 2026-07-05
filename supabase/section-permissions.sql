-- Light of Life CMS section-based permissions
-- Run this after the initial schema SQL.

create table if not exists public.section_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  section_key text not null,
  can_edit boolean not null default true,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, section_key)
);

grant usage on schema public to anon, authenticated;

grant select on public.site_sections to anon, authenticated;
grant select on public.service_rosters to anon, authenticated;
grant select on public.prayer_items to anon, authenticated;
grant select on public.media_assets to anon, authenticated;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update, delete on public.section_permissions to authenticated;
grant insert, update, delete on public.site_sections to authenticated;
grant insert, update, delete on public.service_rosters to authenticated;
grant insert, update, delete on public.prayer_items to authenticated;
grant insert, update, delete on public.media_assets to authenticated;
grant select, insert on public.audit_logs to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_edit_content() to authenticated;
grant execute on function public.can_view_admin() to authenticated;

drop trigger if exists section_permissions_set_updated_at on public.section_permissions;

create trigger section_permissions_set_updated_at
before update on public.section_permissions
for each row execute function public.set_updated_at();

alter table public.section_permissions enable row level security;

create or replace function public.can_edit_section(target_section_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_admin()
    or (
      public.current_user_role() = 'editor'::public.app_role
      and exists (
        select 1
        from public.section_permissions
        where user_id = auth.uid()
          and section_key = target_section_key
          and can_edit = true
      )
    );
$$;

grant execute on function public.can_edit_section(text) to authenticated;

drop policy if exists "section_permissions_admin_all" on public.section_permissions;
drop policy if exists "section_permissions_read_own" on public.section_permissions;

create policy "section_permissions_read_own"
on public.section_permissions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "section_permissions_admin_all"
on public.section_permissions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Replace broad editor permissions with section-scoped policies.
drop policy if exists "site_sections_admin_read_all" on public.site_sections;
drop policy if exists "site_sections_section_read" on public.site_sections;
drop policy if exists "site_sections_editor_insert" on public.site_sections;
drop policy if exists "site_sections_editor_update" on public.site_sections;
drop policy if exists "site_sections_editor_delete" on public.site_sections;
drop policy if exists "site_sections_admin_insert" on public.site_sections;
drop policy if exists "site_sections_section_update" on public.site_sections;
drop policy if exists "site_sections_admin_delete" on public.site_sections;

create policy "site_sections_admin_insert"
on public.site_sections
for insert
to authenticated
with check (public.is_admin());

create policy "site_sections_section_read"
on public.site_sections
for select
to authenticated
using (
  status = 'published'
  or public.is_admin()
  or public.can_edit_section(section_key)
);

create policy "site_sections_section_update"
on public.site_sections
for update
to authenticated
using (public.can_edit_section(section_key))
with check (public.can_edit_section(section_key));

create policy "site_sections_admin_delete"
on public.site_sections
for delete
to authenticated
using (public.is_admin());

drop policy if exists "service_rosters_admin_read_all" on public.service_rosters;
drop policy if exists "service_rosters_section_read" on public.service_rosters;
drop policy if exists "service_rosters_editor_insert" on public.service_rosters;
drop policy if exists "service_rosters_editor_update" on public.service_rosters;
drop policy if exists "service_rosters_admin_delete" on public.service_rosters;
drop policy if exists "service_rosters_section_insert" on public.service_rosters;
drop policy if exists "service_rosters_section_update" on public.service_rosters;

create policy "service_rosters_section_insert"
on public.service_rosters
for insert
to authenticated
with check (public.can_edit_section('service_rosters'));

create policy "service_rosters_section_read"
on public.service_rosters
for select
to authenticated
using (
  status = 'published'
  or public.is_admin()
  or public.can_edit_section('service_rosters')
);

create policy "service_rosters_section_update"
on public.service_rosters
for update
to authenticated
using (public.can_edit_section('service_rosters'))
with check (public.can_edit_section('service_rosters'));

create policy "service_rosters_admin_delete"
on public.service_rosters
for delete
to authenticated
using (public.is_admin());

drop policy if exists "prayer_items_admin_read_all" on public.prayer_items;
drop policy if exists "prayer_items_section_read" on public.prayer_items;
drop policy if exists "prayer_items_editor_insert" on public.prayer_items;
drop policy if exists "prayer_items_editor_update" on public.prayer_items;
drop policy if exists "prayer_items_admin_delete" on public.prayer_items;
drop policy if exists "prayer_items_section_insert" on public.prayer_items;
drop policy if exists "prayer_items_section_update" on public.prayer_items;
drop policy if exists "prayer_items_section_delete" on public.prayer_items;

create policy "prayer_items_section_insert"
on public.prayer_items
for insert
to authenticated
with check (public.can_edit_section('prayer_items'));

create policy "prayer_items_section_read"
on public.prayer_items
for select
to authenticated
using (
  status = 'published'
  or public.is_admin()
  or public.can_edit_section('prayer_items')
);

create policy "prayer_items_section_update"
on public.prayer_items
for update
to authenticated
using (public.can_edit_section('prayer_items'))
with check (public.can_edit_section('prayer_items'));

create policy "prayer_items_section_delete"
on public.prayer_items
for delete
to authenticated
using (public.can_edit_section('prayer_items'));

drop policy if exists "media_assets_editor_insert" on public.media_assets;
drop policy if exists "media_assets_editor_update" on public.media_assets;
drop policy if exists "media_assets_admin_insert" on public.media_assets;
drop policy if exists "media_assets_admin_update" on public.media_assets;
drop policy if exists "media_assets_content_insert" on public.media_assets;
drop policy if exists "media_assets_content_update" on public.media_assets;

create policy "media_assets_content_insert"
on public.media_assets
for insert
to authenticated
with check (public.can_edit_content());

create policy "media_assets_content_update"
on public.media_assets
for update
to authenticated
using (public.can_edit_content())
with check (public.can_edit_content());

drop policy if exists "site_media_editor_insert" on storage.objects;
drop policy if exists "site_media_editor_update" on storage.objects;
drop policy if exists "site_media_admin_insert" on storage.objects;
drop policy if exists "site_media_admin_update" on storage.objects;
drop policy if exists "site_media_content_insert" on storage.objects;
drop policy if exists "site_media_content_update" on storage.objects;

create policy "site_media_content_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'site-media'
  and public.can_edit_content()
);

create policy "site_media_content_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'site-media'
  and public.can_edit_content()
)
with check (
  bucket_id = 'site-media'
  and public.can_edit_content()
);

-- Give current admins all editable sections so they can manage the first setup.
insert into public.section_permissions (user_id, section_key, can_edit)
select profiles.id, sections.section_key, true
from public.profiles
cross join (
  values
    ('top_announcement'),
    ('gatherings'),
    ('messages'),
    ('bible_reading'),
    ('service_rosters'),
    ('prayer_items')
) as sections(section_key)
where profiles.role = 'admin'
on conflict (user_id, section_key) do update
set can_edit = excluded.can_edit,
    updated_at = now();
