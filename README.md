# MILA-Server

Server setup of MILA Mitmach-Supermarkt e.G.

## Local development

- Clone this repository on your local system
- Create .env file with `cp .env.example .env`
- Run `docker compose -f docker-compose.dev.yml build collectivo --no-cache`
- Run `docker compose -f docker-compose.dev.yml up -d`

## Production system

Set up a reverse proxy with a docker network called `proxiable` (e.g. with https://www.linode.com/docs/guides/using-nginx-proxy-manager/)

Nginx for Keycloak needs Custom Nginx Configuration (https://stackoverflow.com/questions/56126864)

```
proxy_buffer_size   128k;
proxy_buffers   4 256k;
proxy_busy_buffers_size   256k;
```

- Clone this repository on your server
- Run `docker compose build collectivo --no-cache`

## Database backups

Backups are created automatically for `directus-db` and `keycloak-db`, using [`postgres-backup-local`](https://github.com/prodrigestivill/docker-postgres-backup-local?tab=readme-ov-file#how-the-backups-folder-works). The backups can be found in the directories `directus-db-backups` and `keycloak-db-backups`.

To run a manual backup, run:

```sh
docker-compose exec directus-db-backups /backup.sh
```

A new backup will be saved in `directus-db-backups/last/directus-XXXXXXXX-XXXXXX.sql.gz`.

To restore a backup, decompress the backup file and then run:

```sh
docker compose exec directus-db psql -U directus -d directus -f backups/last/directus-XXXXXXXX-XXXXXX.sql
```

Notes:

- For local development, use `docker compose -f docker-compose.dev.yml ...`
- Alternatively to using `postgres-backup-local`, you can also create a backup as follows:
  - Run `docker compose exec directus-db sh`
  - Then run `pg_dump --clean -U directus directus > backups/my-manual-backup.sql`
- To reset the database before restoring a backup
  - Delete the container & volume and then start the container agein
  - To remove the volume, you need to use `docker volume rm`, as `docker compose rm -v` does not work.
  - Do not start directus before restoring the backup as it will start migrations on an empty db.
- Backups are run with `--clean` so that they can be applied to an existing database.
- To decompress the backup file, you can use `gzip` on linux or `7-zip` on windows.
