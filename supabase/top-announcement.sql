-- Top announcement CMS section.
-- Run this in Supabase SQL Editor to make the top bar editable in /admin/.

begin;

insert into public.site_sections (
  section_key,
  title_zh,
  title_en,
  content,
  status,
  published_at,
  created_at,
  updated_at
)
values (
  'top_announcement',
  '顶部预告',
  'Top Announcement',
  '{
    "label_zh": "中區禱告會",
    "label_en": "Central Auckland Prayer Meeting",
    "headline_zh": "8月4日（週二）晚上 7:30–9:00",
    "headline_en": "4 Aug (Tue), 7:30–9:00 PM",
    "detail_zh": "將在本教會舉行",
    "detail_en": "Held at our church",
    "cta_zh": "了解詳情",
    "cta_en": "Learn more",
    "url": "#updates"
  }'::jsonb,
  'published',
  now(),
  now(),
  now()
)
on conflict (section_key) do update
set title_zh = excluded.title_zh,
    title_en = excluded.title_en,
    content = excluded.content,
    status = 'published',
    published_at = coalesce(public.site_sections.published_at, now()),
    updated_at = now();

insert into public.section_permissions (user_id, section_key, can_edit)
select profiles.id, 'top_announcement', true
from public.profiles
where profiles.role = 'admin'
on conflict (user_id, section_key) do update
set can_edit = excluded.can_edit,
    updated_at = now();

commit;
