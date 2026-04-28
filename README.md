# MILA Mitgliederplattform

Member plattform of [MILA Mitmach-Supermarkt e.G.](https://www.mila.wien/).

## Local development setup

- Install Docker, nodejs, and PNPM
- Clone this repository

- Create .env file with `cp .env.example .env`
- Run `docker compose up -d` and wait for directus to be ready
- Run `docker compose exec -u root directus-dev chown -R node:node /directus/extensions /directus/uploads`
- Run `npx directus-sync push` to apply data schema
- Install packages with `pnpm i`
- Start dev server with `pnpm dev`
- Go to http://localhost:3000 and click on "Seed example data" or run `pnpm seed`

The following services will then be available:

- Frontend http://localhost:3000
- Directus http://localhost:8055

Test users for frontend and directus (after seeding):

- `admin@example.com` / `admin`
- `editor@example.com` / `editor`
- `user@example.com` / `user`

## Troubleshooting

- Resetting everything
  - Delete `.env` and `collectivo/.env`
  - To be super clean, also delete `node_modules`, `collectivo/node_modules`, and `collectivo/.nuxt`
  - Run `docker compose down -v`

## Testing

To run end-to-end tests, run `npx cypress open` or `npx cypress run`

## Database schemas

Collectivo uses [directus-sync](https://github.com/tractr/directus-sync) to apply the database schema.

Updating the database schema

- Make changes to the database schema on your local system
- Run `npx directus-sync pull && node sort-directus-config.mjs` to update the database schema in the repository
- Make a database backup of the production system (see below)
- Run `npx directus-sync push` (credentials will be taken from .env)

Troubleshooting

- Changing the directus version also changes the schema. Pull the schema after changing the version and starting the container.
- Changing flows often creates errors on push, this can be solved by deleting the changed flows manually before pushing.
- When changing the directus version, push the schema first, then change the directus version, and then pull the schema again.

## Database backups

Database backups are not managed by Docker Compose. The Directus database is an external PostgreSQL instance; backups must be handled by the database host provider or a separate backup tool.

For local development, you can create a manual backup of `directus-db-dev`:

```sh
docker compose exec directus-db-dev pg_dump --clean -U directus directus > my-backup.sql
```

To restore it:

```sh
docker compose exec -T directus-db-dev psql -U directus -d directus < my-backup.sql
```

To reset the dev database before restoring (this will delete all data):

```sh
docker compose down -v
docker compose up -d directus-db-dev
# wait for healthy, then restore
```

## Local setup with Keycloak

The dev setup runs without keycloak. To test keycloak integration, run both compose files:

- In `collectivo/.env`, set `NUXT_PUBLIC_USE_KEYCLOAK = "true"`
- In `.env`, set `DIRECTUS_AUTH_PROVIDERS` to `keycloak`
- Add the following to your etc/hosts file ([here is a guide](https://www.howtogeek.com/27350/beginner-geek-how-to-edit-your-hosts-file/)): `127.0.0.1 keycloak`
- Run `docker compose -f docker-compose.production.yml up -d keycloak keycloak-db`

Login credentials for directus admin without keycloak:

- Username `directus-admin@example.com`
- Password `admin`

Login credentials for keycloak admin UI:

- Username `keycloak-admin@example.com`
- Password `admin`

## Production setup

- Install Docker and PNPM
- Create a sync lock file `"/directus/uploads/sync.lock"`
- Provision an external PostgreSQL database (with PostGIS extension) for Directus
- Set .env vars
  - Generate secure secrets, keys, and passwords
  - Set `DIRECTUS_DB_HOST` to the hostname of the external Directus database
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
- Run `docker compose -f docker-compose.production.yml up -d`

## Server updates

For deploying updates on the server:

- Create a database backup (see above)
- Run `git pull`
- Optional: if the directus version changed, perform the upgrade on the running server:
  - Build the new version: `docker compose -f docker-compose.production.yml build directus`
  - Run the new version: `docker compose -f docker-compose.production.yml up -d directus`
- Optional: Run `pnpm i`
- Run `pnpm build`
- Optional: If the environment configuration in .env or the docker compose file changed: Run `docker compose -f docker-compose.production.yml up -d collectivo`
- Run `docker compose -f docker-compose.production.yml restart collectivo`
- Optional: Apply database schema changes (see above)
