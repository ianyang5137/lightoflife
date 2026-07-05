#!/bin/sh
set -eu

stamp="$(date +%Y%m%d-%H%M%S)"
retention="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p /backups/postgres /backups/uploads

echo "[$(date -Iseconds)] Starting PostgreSQL backup"
pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "/backups/postgres/lightoflife-${stamp}.dump"

echo "[$(date -Iseconds)] Starting uploads backup"
tar -czf "/backups/uploads/directus-uploads-${stamp}.tar.gz" -C / directus_uploads

find /backups/postgres -type f -name "*.dump" -mtime +"$retention" -delete
find /backups/uploads -type f -name "*.tar.gz" -mtime +"$retention" -delete

echo "[$(date -Iseconds)] Backup complete"
