# MILA-Server

Server setup of MILA Mitmach-Supermarkt e.G.

## Local development

- Clone this repository on your local system
- Create .env file with `cp .env.example .env`
- Run `docker compose -f docker-compose.dev.yml build collectivo --no-cache`
- Run `docker compose -f docker-compose.dev.yml up -d`

## Production system

Set up a reverse proxy with a docker network called `proxiable` (e.g. with https://www.linode.com/docs/guides/using-nginx-proxy-manager/)

Nginx for Keycloak needs (https://stackoverflow.com/questions/56126864)

```
proxy_buffer_size   128k;
proxy_buffers   4 256k;
proxy_busy_buffers_size   256k;
```

- Clone this repository on your server
- Run `docker compose build collectivo --no-cache`
