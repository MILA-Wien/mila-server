# Keycloak

[Keycloak docs](https://www.keycloak.org/docs/latest/server_admin/index.html#keycloak-features-and-concepts)

## Updating

Guidelines and breaking changes can be found [here](https://www.keycloak.org/docs/latest/upgrading/index.html).

Steps to test new version:

1. Update tag in the [Dockerfile](keycloak/Dockerfile)
1. Build keycloak with
   ```
   docker compose --profile keycloak build keycloak
   ```
1. Restart the container and check version
   ```
   docker exec keycloak /opt/keycloak/bin/kc.sh --version
   ```
1. Check logs
   ```
   docker compose logs keycloak
   ```
## [Exporting and importing a realm](https://www.keycloak.org/server/importExport)

Export collectivo realm with separate user file.
```
docker exec -it keycloak /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/export \
  --realm collectivo \
  --users different_files
```

Copy file into repo folder `keycloak/export` and own exported files.
```
sudo docker cp keycloak:/opt/keycloak/data/export keycloak
sudo chown -R my_user:users keycloak/export
```

Move to files to `keycloak/import`, delete collectivo realm from keycloak admin console, and restart the container to check whether the realm imports correctly.

With
```
KEYCLOAK_COMMAND = 'start-dev --import-realm --health-enabled true'
```
in `.env`, the contents of `keycloak/import` are imported at startup.
