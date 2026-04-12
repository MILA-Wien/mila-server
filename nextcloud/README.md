# Nextcloud

[Admin manual](https://docs.nextcloud.com/server/stable/admin_manual/)

## Apps

- Login with the admin user you created.
- Install apps
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
    - Allow the OIDC app to  [send secrets over http in plain text](https://github.com/nextcloud/user_oidc#allow-login-over-unencrypted-http)
    ```
    docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ config:app:set --value=1 --type=boolean user_oidc allow_insecure_http
    ```
    - Go to Admin settings > OpenID Connect > Register
      - Identifier: anything descriptive, e.g. `Keycloak`
      - Client ID: `nextcloud` (as defined in the [collectivo realm](keycloak/import/collectivo-realm.json))
      - Client Secret: empty
      - Discovery endpoint: `http://keycloak:8080/realms/collectivo/.well-known/openid-configuration`
    - You can now login with the test users as for directus

## [Redirect to keycloak login](https://github.com/nextcloud/user_oidc?tab=readme-ov-file#disable-other-login-methods)

You can disable other logins methods if login is only possible via OIDC (as is the case in production). In case OIDC breaks, admins can still login by appending `?direct=1` to the URL, e.g. at [http://localhost:8081/login?direct=1](http://localhost:8081/login?direct=1).

```
docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ config:app:set --value=0 --type=string user_oidc allow_multiple_user_backends
```

## Troubleshooting

Watch the logs
```
docker exec -u www-data mila-server-nextcloud-1 php /var/www/html/occ log:watch
```

Check whether Nextcloud can reach Keycloak
```
docker compose exec nextcloud curl http://keycloak:8080/realms/collectivo/.well-known/openid-configuration
```

Check settings in `config.php`, e.g. trusted_domains
```
docker exec nextcloud-nextcloud-1 cat /var/www/html/config/config.php
```