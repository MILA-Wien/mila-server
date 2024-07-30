# MILA Server

Applications of [MILA Mitmach-Supermarkt e.G.](https://www.mila.wien/).

## Local setup

- Install Docker and PNPM
- Clone this repository
- Create .env file with `cp .env.example .env`
- Create a network `docker network create proxiable`
- Run `docker compose up -d keycloak keycloak-db`
- When keycloak is running, run `docker compose up -d`
- Log in at http://localhost:8055 with `api@example.com` and `d1r3ctu5`
- Install the [directus-sync](https://www.npmjs.com/package/directus-extension-sync) extension
- Apply schema with `npx directus-sync push`
- Install packages with `pnpm i`
- Start dev server with `pnpm dev`
- Create example data with `pnpm seed` (run in a separate terminal while `pnpm dev` is running, sometimes it needs to be run twice)
- Go to http://localhost:3000 and http://localhost:8055

## Production setup

- Install Docker and PNPM
- [Set up a reverse proxy](https://www.linode.com/docs/guides/using-nginx-proxy-manager/) with a docker network called `proxiable`
- Set the following [custom Nginx configuration](https://stackoverflow.com/questions/56126864) for Keycloak
  ```
  proxy_buffer_size   128k;
  proxy_buffers   4 256k;
  proxy_busy_buffers_size   256k;
  ```
- Clone this repository
- Run `pnpm i` and `pnpm build`
- Run `docker compose up -d`
- Apply database schema (see below)

## Updates

Update collectivo on the server

- Create a database backup (see below)
- Run `git pull`
- Optional: Run `pnpm i`
- Run `pnpm build`
- Run `docker compose restart collectivo`
- Optional: Apply database schema changes (see below)

Update packages

- `cd collectivo`
- `pnpm up --latest`

## Change database schemas

Collectivo uses [directus-sync](https://github.com/tractr/directus-sync) for changes in the database schema.

- Make changes to the database schema on your local system
- Run `npx directus-sync pull` to update the database schema in the repository
- Make a database backup of the production system (see below)
- Run `npx directus-sync push -u "https://studio.mila.wien" -e "<EMAIL>" -p "<PASSWORD>"` to apply the new database schema to the production system

## Database backups

Backups are created automatically for `directus-db` and `keycloak-db`, using [`postgres-backup-local`](https://github.com/prodrigestivill/docker-postgres-backup-local?tab=readme-ov-file#how-the-backups-folder-works). The backups can be found in the directories `directus-db-backups` and `keycloak-db-backups`.

To run a manual backup, run:

```sh
docker compose exec directus-db-backups /backup.sh
```

A new backup will be saved in `directus-db-backups/last/directus-XXXXXXXX-XXXXXX.sql.gz`.

To restore a backup, [decompress the backup file](https://www.wikihow.com/Extract-a-Gz-File) and then run:

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
