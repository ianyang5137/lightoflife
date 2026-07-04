-- Allow users who can edit the prayer_items section to delete prayer items.
-- Run this in Supabase SQL Editor if non-admin prayer editors need delete access.

drop policy if exists "prayer_items_admin_delete" on public.prayer_items;
drop policy if exists "prayer_items_section_delete" on public.prayer_items;

create policy "prayer_items_section_delete"
on public.prayer_items
for delete
to authenticated
using (public.can_edit_section('prayer_items'));
