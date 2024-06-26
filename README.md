# MILA-Server

Server config of MILA Mitmach-Supermarkt e.G.

## Local dev setup

- Clone this repository on your local system
- Create .env file with `cp .env.example .env`
- Create a network `docker network create proxiable`
- Run `docker compose up -d`

## Production setup

- Set up a reverse proxy with a docker network called `proxiable` (e.g. with https://www.linode.com/docs/guides/using-nginx-proxy-manager/)
- Nginx for Keycloak needs Custom Nginx Configuration (https://stackoverflow.com/questions/56126864)
  ```
  proxy_buffer_size   128k;
  proxy_buffers   4 256k;
  proxy_busy_buffers_size   256k;
  ```
- Clone this repository on your server
- Run `pnpm i` and `pnpm build`
- Run `docker compose up -d`

To update collectivo, run

- Create a database backup (see below)
- `git pull`
- `pnpm i`
- `pnpm build`
- `docker compose up -d`

## Maintenance

Update packages

- `cd collectivo`
- `pnpm up --latest

## Change database schemas

- Make changes to the local system
- Run `npx directus-sync pull` to update the database schema
- Make a database backup of the live system (see below)
- Run `npx directus-sync push -u "https://studio.mila.wien" -e "<EMAIL>" -p "<PASSWORD>"` to apply the database schema to the live system
- See https://github.com/tractr/directus-sync for more infos

## Database backups

Backups are created automatically for `directus-db` and `keycloak-db`, using [`postgres-backup-local`](https://github.com/prodrigestivill/docker-postgres-backup-local?tab=readme-ov-file#how-the-backups-folder-works). The backups can be found in the directories `directus-db-backups` and `keycloak-db-backups`.

To run a manual backup, run:

```sh
docker compose exec directus-db-backups /backup.sh
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
- To reset the database before restoring a backup (this will delete the data!)
  - Delete the container & volume and then start the container agein
  - To remove the volume, you need to use `docker volume rm`, as `docker compose rm -v` does not work.
  - Do not start directus before restoring the backup as it will start migrations on an empty db.
- Backups are run with `--clean` so that they can be applied to an existing database.
- To decompress the backup file, you can use `gzip` on linux or `7-zip` on windows.
