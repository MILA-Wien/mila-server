# Keycloak

[Keycloak docs](https://www.keycloak.org/docs/latest/server_admin/index.html#keycloak-features-and-concepts)

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