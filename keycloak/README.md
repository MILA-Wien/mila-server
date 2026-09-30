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
1. Start the container with `--wait` to wait for it be healthy (assuming you have `keycloak` in `COMPOSE_PROFILES` in your `.env`)
   ```
   docker compose up --wait
   ```
   or just keycloak and its DB
   ```
   docker compose up --wait keycloak
   ```
1. Check running version
   ```
   docker exec keycloak /opt/keycloak/bin/kc.sh --version
   ```
1. Check logs
   ```
   docker compose logs keycloak
   ```

## [Exporting and importing a realm](https://www.keycloak.org/server/importExport)

### Export

Export collectivo realm with separate user file, copy file into repo folder `keycloak/export`, and own exported files.
```
docker exec -it keycloak /opt/keycloak/bin/kc.sh export \
  --dir /opt/keycloak/data/export \
  --realm collectivo \
  --users different_files
sudo docker cp keycloak:/opt/keycloak/data/export keycloak
sudo chown -R my_user:users keycloak/export
```

### Import

With
```
KEYCLOAK_COMMAND = 'start-dev --import-realm --health-enabled true'
```
in `.env`, the contents of `keycloak/import` are imported at startup. Existing realms are not overwritten by default so they have to be removed if keycloak has been started before.

Steps to import new realms:

- Move the exported json files to `keycloak/import`.
- If realm already exists in database, delete it in the keycloak admin console or remove the entire db volume with:
  ```
  docker volume rm mila-server_keycloak-db-data
  ```
- Start the container to check in the logs. Exports from older keycloak versions throw errors but are usually still imported successfully.

## [Creating a new user attribute](https://www.keycloak.org/docs/latest/server_admin/index.html#managing-attributes)

Add the attribute to the user profile

- Manage realms > collectivo
- Realm settings > User profile > Create Attribute
- Enter attribute name and display name > Create

Add a mapper to the client scope so keycloak includes the new attribute in the token (eg pronouns attribute to nextcloud client)

- Clients > nextcloud > Client scopes > nextcloud-dedicated
- Add mapper > by configuration > user attribute

   | Field | Value | Explanation |
   | --- | --- | --- |
   | Name | a descriptive name | Identifies the mapper in the client scope config |
   | User attribute | `pronouns` | The Keycloak user attribute to read the value from |
   | Token claim name | `pronouns` | The claim name the value is exposed as in the issued token -> add in the client |

A client's dedicated scope is included in every token issued to that client, regardless of what's in the scope parameter of the authorization request.
This means it does not need to be explicitly added to the scopes on the client side.

Empty fields are omitted from the token, meaning values are not deleted on the client side. They have to be manually deleted in the client, eg nextcloud.
