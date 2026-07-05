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

## Collections

- `site_settings` - basic site copy, common links and visibility switches used by the public website.
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
- `Editor` - can create, read, update and delete pages, announcements, events, sermons and gallery; read-only for other collections.
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
