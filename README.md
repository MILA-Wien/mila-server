# MILA Server

Anwendungen des [MILA Mitmach-Supermarkt e.G.](https://www.mila.wien/), inklusive Mitglieder- und Schichtenverwaltung. Weitere Informationen für Mitglieder unter https://handbuch.mila.wien/.

## Services

- Mitgliederplattform (collectivo)
- Datenstudio (directus & directus-db)
- Zugangsverwaltung (keycloak & keycloak-db)
- Direktkreditverwaltung (habidat & habidat-db)
- Backups (directus-db-backup & keycloak-db-backup)

## Local development setup (only Nuxt and Directus)

- Install Docker and PNPM
- Clone this repository

- Create .env file with `cp .env.example .env`
- Create a network `docker network create proxiable`
- Run `docker compose up -d`
- Run `docker compose exec -u root directus chown -R node:node /directus/extensions /directus/uploads`
- Install packages with `pnpm i`
- Start dev server with `pnpm dev`
- In a second terminal, make an API call to create example data with `pnpm seed`

The following services will then be available:

- Frontend http://localhost:3000
- Directus http://localhost:8055

Test users for frontend and directus:

- `admin@example.com` / `admin`
- `editor@example.com` / `editor`
- `user@example.com` / `user`

## Deployment

For deploying updates on the server:

- Create a database backup (see below)
- Run `git pull`
- Optional: Run `pnpm i`
- Run `pnpm build`
- Run `docker compose restart collectivo`

- Optional: Apply database schema changes (see below)

## Database schemas

Collectivo uses [directus-sync](https://github.com/tractr/directus-sync) to apply the database schema.
The container will automatically apply the schema on first startup and then create a file `./directus/uploads/sync.lock`.
To apply changes in the database schema, remove this file and restart the container or follow the last steps below.

Changing the database schema

- Make changes to the database schema on your local system
- Run `npx directus-sync pull` to update the database schema in the repository
- Make a database backup of the production system (see below)
- Remove `./directus/uploads/sync.lock` and restart the container or run `npx directus-sync push -u "http://localhost:8055" -e "<EMAIL>" -p "<PASSWORD>"` to apply the new database schema to the production system

Troubleshooting

- Changing the directus version also changes the schema. Pull the schema after changing the version and starting the container.
- Changing flows often creates errors on push, this can be solved by deleting the changed flows manually before pushing.

## Database backups

Backups are created automatically for `directus-db` and `keycloak-db`, using [`postgres-backup-local`](https://github.com/prodrigestivill/docker-postgres-backup-local?tab=readme-ov-file#how-the-backups-folder-works). The backups can be found in the directories `directus-db-backups` and `keycloak-db-backups`.

To run a manual backup, go to `\collectivo-mila` and run:

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

## Local setup with Keycloak

- In `collectivo/.env`, set `DEBUG = "false"`
- In `.env`, set `COMPOSE_PROFILES = "production"`
- In `.env`, set `DIRECTUS_AUTH_PROVIDERS`to `keycloak`
- Add the following to your etc/hosts file ([here is a guide](https://www.howtogeek.com/27350/beginner-geek-how-to-edit-your-hosts-file/)): `127.0.0.1 keycloak`

Login credentials for directus admin without keycloak:

- Username `directus-admin@example.com`
- Password `admin`

Login credentials for keycloak admin UI:

- Username `keycloak-admin@example.com`
- Password `admin`

## Production setup

- Install Docker and PNPM
- Set .env vars
  - Generate secure secrets, keys, and passwords
  - Set `COMPOSE_PROFILES="production"`
  - Remove variable `KEYCLOAK_COMMAND`
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
