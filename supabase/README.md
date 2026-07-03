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

User creation:

- Create users in Supabase Dashboard → Authentication → Users.
- After the user signs in or appears in `profiles`, use `/admin/` → 用户與權限 to set their role and editable sections.

Image uploads:

- The admin UI uploads local images to the public `site-media` Storage bucket.
- Re-run `section-permissions.sql` after enabling uploads so admins and content editors can write to Storage under the site media bucket.

The first admin UI intentionally exposes only basic fields: titles, text, times,
Zoom information, video ID, serving roster names, and prayer item text. Advanced
fields such as status, sorting, and visibility remain hidden from non-admin users.
