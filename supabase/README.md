# Light of Life CMS setup

Run the SQL files in Supabase SQL Editor in this order:

1. Run the initial schema SQL that creates `profiles`, `site_sections`, `service_rosters`, `prayer_items`, `media_assets`, and seed content.
2. Run `section-permissions.sql`.
3. Run `admin-access-requests.sql` if you want users to self-register with email verification.
4. Run `prayer-items-delete-policy.sql` if non-admin prayer editors should be able to delete prayer items.

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

- Users can request an account from `/admin/` after Supabase Email confirmation is enabled.
- New users must verify their email first.
- Admins manage new accounts in `/admin/` → 用户與權限 by setting role, enabled/disabled status, and section permissions.
- You can still create users manually in Supabase Dashboard → Authentication → Users, then manage role and sections in `/admin/` → 用户與權限.

Image uploads:

- The admin UI uploads local images to the public `site-media` Storage bucket.
- Re-run `section-permissions.sql` after enabling uploads so admins and content editors can write to Storage under the site media bucket.

Automatic YouTube preview:

- `.github/workflows/update-youtube-preview.yml` runs every Sunday after 7 PM New Zealand time and updates the homepage video preview from the latest item on the church YouTube live/streams page.
- Add a GitHub Actions secret named `SUPABASE_SERVICE_ROLE_KEY` with the Supabase service role key. The public publishable key cannot update CMS rows.
- You can also run the workflow manually from GitHub Actions → `Update YouTube Preview`.

The first admin UI intentionally exposes only basic fields: titles, text, times,
Zoom information, video ID, serving roster names, and prayer item text. Advanced
fields such as status, sorting, and visibility remain hidden from non-admin users.
