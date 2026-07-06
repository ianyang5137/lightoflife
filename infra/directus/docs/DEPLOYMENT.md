# Light of Life Directus Deployment

This directory deploys the first phase of the new CMS stack:

- Directus CMS
- PostgreSQL
- Docker Compose
- Internal container Nginx reverse proxy
- Host Nginx + Let's Encrypt for `admin.lightoflife.org.nz`
- Daily PostgreSQL and Directus uploads backups

## Files

- `docker-compose.yml` - application stack.
- `.env.example` - copy to `.env` and fill secrets.
- `nginx/lightoflife-directus.conf` - container Nginx config.
- `nginx/admin.lightoflife.org.nz.conf` - host Nginx SSL reverse proxy config.
- `scripts/init-directus.mjs` - creates collections, fields, roles and permissions.
- `scripts/optimize-admin-experience.mjs` - creates editor-friendly collections, roles and permissions for day-to-day content editing.
- `scripts/optimize-admin-ui.sql` - reorders and labels admin collections, then hides technical fallback collections.
- `scripts/sync-youtube-latest.mjs` - syncs the latest YouTube video into the homepage message section.
- `scripts/backup.sh` - daily backup job used by the backup container.

## Server Path

Use:

```bash
/apps/website/lightoflife
```

## DNS

Create:

```text
admin.lightoflife.org.nz A <oracle-server-public-ip>
```

## Deploy

```bash
cd /apps/website/lightoflife
cp .env.example .env
nano .env
docker compose up -d
```

If GitHub Pages reports `Deployment failed, try again later` while the build job is green, retry the Pages deployment. This is a GitHub Pages deployment-side transient failure, not a Directus stack failure.

Then install the host Nginx config and certificate:

```bash
sudo cp nginx/admin.lightoflife.org.nz.conf /etc/nginx/sites-available/admin.lightoflife.org.nz
sudo ln -sf /etc/nginx/sites-available/admin.lightoflife.org.nz /etc/nginx/sites-enabled/admin.lightoflife.org.nz
sudo certbot --nginx -d admin.lightoflife.org.nz -m oyzpeng@gmail.com --agree-tos --no-eff-email
sudo nginx -t
sudo systemctl reload nginx
```

Initialize Directus:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/init-directus.mjs
```

Seed the current website content:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/seed-current-content.mjs
```

Seed the frontend-compatible dynamic content used by the current static site:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/seed-frontend-data.mjs
```

This creates and fills the technical collections used by the public site:

- `site_sections`
- `service_rosters`
- `prayer_items`

Clean up the Directus editing UI after seeding:

```bash
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/cleanup-admin-ui.sql
```

This hides duplicate technical collections, adds editable service roster rows, and applies Chinese labels for the main admin collections.

Seed the editable basic site settings and common switches:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/setup-site-settings.mjs
```

This creates the `site_settings` singleton for stable homepage copy, section headings, contact links, footer links and common visibility switches.

Create the editor-friendly homepage collections:

```bash
ADMIN_PASSWORD='your-admin-password' DIRECTUS_URL='https://admin.lightoflife.org.nz' node scripts/optimize-admin-experience.mjs
docker compose exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" < scripts/optimize-admin-ui.sql
```

This keeps the public website visually unchanged, but makes the admin easier to edit by splitting JSON content into normal Directus records:

- `homepage_announcements` - top event/notice bar.
- `gathering_items` - the three gathering cards with image upload support.
- `message_settings` - Sunday message card text and YouTube channel button.
- `youtube_latest` - read-only latest YouTube video synced by the cron service.
- `bible_readings` - online Bible reading time, scripture and Zoom information.
- `bible_reading_questions` - editable Bible reading question rows.

The older `site_sections` collection remains as a technical fallback for compatibility and is hidden from the normal sidebar.

## YouTube Latest Video Sync

The `youtube_sync` service runs once when it starts and then every Sunday at 19:15 New Zealand time:

```text
15 19 * * 0
```

It updates the `youtube_latest` singleton and the fallback `messages` record in `site_sections` with the latest video ID and embed URL from the church YouTube channel. It tries YouTube Data API first when `YOUTUBE_API_KEY` is available, then falls back to YouTube's public RSS feed.

Manual sync:

```bash
docker compose run --rm youtube_sync node scripts/sync-youtube-latest.mjs
```

## Collections

- `site_settings` - basic site copy, common links and visibility switches used by the public website.
- `homepage_announcements` - top event/notice bar.
- `gathering_items` - gathering cards with `zh` / `en` text and image upload support.
- `message_settings` - Sunday message card text and YouTube channel button.
- `youtube_latest` - latest YouTube video, maintained by the sync job.
- `bible_readings` - online Bible reading time, scripture and Zoom information.
- `bible_reading_questions` - online Bible reading discussion questions.
- `pages` - page content with `zh` / `en` title and body fields.
- `sermons` - weekly sermon title, speaker, date, content, audio URL, YouTube URL and cover image.
- `events` - event calendar title, date, time, location, description and cover image.
- `prayer_requests` - prayer request title, content, status and public flag.
- `small_groups` - group name, leader, time, location and description.
- `announcements` - announcement title, content, publish date and status.
- `gallery` - photo gallery title, image, category and date.
- `languages` - language records for `zh` and `en`.

Directus built-in users and roles are used for admin accounts.

## Roles

- `Administrator` - Directus built-in full access.
- `Content Editor` - can edit basic site settings, homepage content, announcements, events, sermons, gallery and small groups.
- `Roster Editor` - can edit service rosters only.
- `Prayer Editor` - can edit prayer items only.
- `Media Editor` - can edit Sunday message settings, latest video data, sermons and gallery.
- `Editor` - legacy general editor role from the initial setup.
- `Viewer` - read-only access to website content collections.

## Backups

Backups run daily at 02:00 inside the `backup` container.

Manual backup:

```bash
docker compose exec backup /usr/local/bin/backup.sh
```

PostgreSQL backup files:

```text
/apps/website/lightoflife/backups/postgres/*.dump
```

Uploads backup files:

```text
/apps/website/lightoflife/backups/uploads/*.tar.gz
```

## Restore

Restore PostgreSQL:

```bash
docker compose stop directus
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists < backups/postgres/lightoflife-YYYYMMDD-HHMMSS.dump
docker compose start directus
```

Restore uploads:

```bash
docker compose down
docker run --rm -v lightoflife_directus_uploads:/directus_uploads -v "$PWD/backups/uploads:/restore" alpine sh -c 'rm -rf /directus_uploads/* && tar -xzf /restore/directus-uploads-YYYYMMDD-HHMMSS.tar.gz -C /'
docker compose up -d
```
