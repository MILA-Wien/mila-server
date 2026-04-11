# MILA Mitgliederplattform

Member plattform of [MILA Mitmach-Supermarkt e.G.](https://www.mila.wien/).

## Local development setup

- Install Docker and PNPM
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

The dev setup runs without keycloak. To test keycloak integration:

- In `collectivo/.env`, set `NUXT_PUBLIC_USE_KEYCLOAK = "true"`
- In `.env`, set `COMPOSE_PROFILES = "dev,keycloak"`
- In `.env`, set `DIRECTUS_AUTH_PROVIDERS`to `keycloak`
- Add the following to your etc/hosts file ([here is a guide](https://www.howtogeek.com/27350/beginner-geek-how-to-edit-your-hosts-file/)): `127.0.0.1 keycloak`

Login credentials for directus admin without keycloak:

- Username `directus-admin@example.com`
- Password `admin`

Login credentials for [keycloak admin UI](http://keycloak:8080):

- Username `admin@example.com`
- Password `admin`

[Keycloak docs](https://www.keycloak.org/docs/latest/server_admin/index.html#keycloak-features-and-concepts)

## Local setup with Nextcloud

### Setup

- In `.env`, set `COMPOSE_PROFILES = "dev,keycloak,nextcloud"`
- Open the [Nextcloud GUI](http://localhost:8081) and create an admin user to finish the installation.
- Install apps:
  - in production
    - [OpenID Connect user backend](https://github.com/nextcloud/user_oidc)
    - [Calendar](https://github.com/nextcloud/calendar/)
    - [Forms](https://github.com/nextcloud/forms)
    - [Nextcloud Office](https://collaboraoffice.com/)
  - testing
    - [Deck](https://github.com/nextcloud/deck)
    - [Talk](https://github.com/nextcloud/spreed) ([documentation](https://nextcloud-talk.readthedocs.io/en/latest/quick-install/))
    - [Two-factor authentication](https://github.com/nextcloud/twofactor_totp)
- Configure OpenID Connect app
    - Allow Nextcloud to [make requests to servers on the LAN](https://docs.nextcloud.com/server/stable/admin_manual/configuration_server/config_sample_php_parameters.html#allow-local-remote-servers)
    ```
    docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ config:system:set allow_local_remote_servers --value=true --type=boolean
    ```
    - Allow the OIDC app to  [send secrets over http in plain text](https://github.com/nextcloud/user_oidc#allow-login-over-unencrypted-http)
    ```
    docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ config:app:set --value=1 --type=boolean user_oidc allow_insecure_http
    ```
    - Go to Admin settings > OpenID Connect > Register
      - Identifier: anything descriptive, e.g. `keycloak`
      - Client ID: `nextcloud` (as defined in the [collectivo realm](keycloak/import/collectivo-realm.json))
      - Client Secret: empty
      - Discovery endpoint: `http://keycloak:8080/realms/collectivo/.well-known/openid-configuration`
    - You can now login with the test users as for directus

### Troubleshooting
- Watch the logs
  ```
  docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ log:watch
  ```
- Check whether Nextcloud can reach Keycloak
  ```
  docker compose exec nextcloud curl http://keycloak:8080/realms/collectivo/.well-known/openid-configuration
  ```
- Check settings in `config.php`, e.g. trusted_domains
  ```
  docker exec nextcloud-nextcloud-1 cat /var/www/html/config/config.php
  ```

## Production setup

- Install Docker and PNPM
- Create a sync lock file `"/directus/uploads/sync.lock"`
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

## Server updates

For deploying updates on the server:

- Create a database backup (see above)
- Run `git pull`
- Optional: if the directus version changed, perform the upgrade on the running server:
  - Build the new version: `docker compose build directus`
  - Run the new version: `docker compose up -d directus`
- Optional: Run `pnpm i`
- Run `pnpm build`
- Optional: If the environment configuration in .env or the docker compose file changed: Run `docker compose up -d collectivo`
- Run `docker compose restart collectivo`
- Optional: Apply database schema changes (see above)
