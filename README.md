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
- Run `npx directus-sync push` (credentials will be taken from `.env`). For the MILA production system, this push happens via Dokploy container exec on the `directus` container — see "MILA production setup (Dokploy)" below.

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
- In `.env`, set `KEYCLOAK_DB_HOST = "keycloak-db"`
- Add the following to your etc/hosts file ([here is a guide](https://www.howtogeek.com/27350/beginner-geek-how-to-edit-your-hosts-file/)): `127.0.0.1 keycloak`
- Run `docker compose up -d keycloak-db`
- Run `docker compose -f docker-compose.production.yml up -d keycloak`

Login credentials for directus admin without keycloak:

- Username `directus-admin@example.com`
- Password `admin`

Login credentials for keycloak admin UI:

- Username `keycloak-admin@example.com`
- Password `admin`

## Generic production setup

This section describes how to run the stack on any Docker host without Dokploy. For the MILA-managed deploy, see the next section.

- Install Docker and PNPM
- Provision an external PostgreSQL database (with PostGIS extension) for Directus
- Provision an external MariaDB database for Habidat
- Provision an external PostgreSQL database for Keycloak
- Set `.env` vars
  - Generate secure secrets, keys, and passwords
  - Set `DIRECTUS_DB_HOST` to the hostname of the external Directus database
  - Set `HABIDAT_DB_HOST` to the hostname of the external Habidat database
  - Set `KEYCLOAK_DB_HOST` to the hostname of the external Keycloak database
  - Remove variable `KEYCLOAK_COMMAND` (absence triggers production mode)
- The compose file expects an external Docker network called `dokploy-network` (see [docker-compose.production.yml:176-178](docker-compose.production.yml#L176-L178)). On a non-Dokploy host, either create it manually with `docker network create dokploy-network` and attach your reverse proxy and database services to it, or edit the compose file to use a different network name.
- Set up a reverse proxy of your choice (e.g. Traefik, Caddy, nginx-proxy-manager) in front of the `directus`, `collectivo`, `keycloak`, and `habidat` services.
- Clone this repository
- Run `pnpm i` and `pnpm build`
- Run `docker compose -f docker-compose.production.yml up -d`

On first start, the directus container automatically pushes the in-repo schema if `/directus/uploads/sync.lock` is absent (see [directus/entrypoint.sh:17-20](directus/entrypoint.sh#L17-L20)). Create that lock file afterwards (`docker compose -f docker-compose.production.yml exec directus touch /directus/uploads/sync.lock`) to prevent the auto-push from running on every restart.

### Updates

For deploying updates on a self-hosted (non-Dokploy) server:

- Create a database backup (see above)
- Run `git pull`
- Optional: if the directus version changed, perform the upgrade on the running server:
  - Build the new version: `docker compose -f docker-compose.production.yml build directus`
  - Run the new version: `docker compose -f docker-compose.production.yml up -d directus`
- Optional: Run `pnpm i`
- Run `pnpm build`
- Optional: If the environment configuration in `.env` or the docker compose file changed: Run `docker compose -f docker-compose.production.yml up -d collectivo`
- Run `docker compose -f docker-compose.production.yml restart collectivo`
- Optional: Apply database schema changes (see above)

## MILA production setup (Dokploy)

The MILA production stack runs on a [Dokploy](https://dokploy.com/) server. Dokploy watches the `server.mila.wien` branch of this repository and auto-redeploys whenever it changes. Environment variables, databases, TLS, and backups are all managed through the Dokploy UI; this section documents the day-to-day flow for maintainers.

### Stack layout

- A single Dokploy Compose stack is built from [docker-compose.production.yml](docker-compose.production.yml) on the `server.mila.wien` branch.
- The Directus PostgreSQL, Keycloak PostgreSQL, and Habidat MariaDB databases are Dokploy-managed database services running on the same host. They are reachable from the application containers via the external `dokploy-network`.
- All environment variables listed in [.env.example](.env.example) are configured in the Dokploy stack's environment-variables UI. `KEYCLOAK_COMMAND` is omitted so the production default (`start --optimized`, see [docker-compose.production.yml:108](docker-compose.production.yml#L108)) takes effect.
- Domains and TLS certificates are handled by Dokploy's built-in Traefik via container labels — there is no separate reverse proxy to configure.

### Deploying a change

1. Merge the change into `main` via the regular PR review flow.
2. Fast-forward the `server.mila.wien` branch to the desired commit on `main` and push it.
3. Dokploy detects the push and triggers a rebuild + redeploy of the stack.
4. If the change includes a Directus schema update, run the manual schema-push step described below.

### Pushing a Directus schema update

The directus container's entrypoint auto-pushes the in-repo schema on first boot when `/directus/uploads/sync.lock` is absent ([directus/entrypoint.sh:17-20](directus/entrypoint.sh#L17-L20)). For subsequent schema changes the lock file blocks that auto-push, so the push has to be triggered manually:

- Open the `directus` service in the Dokploy UI and start a terminal (container exec).
- Run `npx directus-sync push` — credentials come from the container's existing `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars.

### Backups

Database backups are configured through Dokploy's built-in database-backup feature on each of the three database services (Directus PG, Keycloak PG, Habidat MariaDB). Restores follow Dokploy's standard restore flow from the respective database service in the UI.

### Rolling back

1. In the `server.mila.wien` branch, `git revert` (preferred) or reset to the previous known-good commit and push.
2. Dokploy will redeploy the older code on detecting the push.
3. Alternatively, redeploy a prior build directly from the deployment-history view in the Dokploy UI.
4. If the rollback crosses a Directus schema change, push the older schema manually using the flow above — the auto-push only runs when `sync.lock` is missing.
