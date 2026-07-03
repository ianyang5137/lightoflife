# Light of Life CMS setup

Run the SQL files in Supabase SQL Editor in this order:

1. Run the initial schema SQL that creates `profiles`, `site_sections`, `service_rosters`, `prayer_items`, `media_assets`, and seed content.
2. Run `section-permissions.sql`.

After creating users in Supabase Authentication, set the first admin:

```sql
update public.profiles
set role = 'admin',
    is_active = true
where email = 'your-email@example.com';
```

Permission model:

- `admin`: can edit every content area and manage users.
- `editor`: can only edit sections assigned in `section_permissions`.
- `viewer`: can sign in and view their account, but cannot edit content unless a section is assigned.

The first admin UI intentionally exposes only basic fields: titles, text, times,
Zoom information, video ID, serving roster names, and prayer item text. Advanced
fields such as status, sorting, and visibility remain hidden from non-admin users.
