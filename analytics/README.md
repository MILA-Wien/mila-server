# MILA Analytics

Data transformation using [data build tool (dbt)](https://github.com/dbt-labs/dbt) v1.

## Setup

Build the image:
```
docker compose build dbt
```

Check db connection:
```
docker compose run --rm dbt debug
```
Git is only needed to fetch dbt packages from a Git repository which is not needed here so the related error can be ignored.

Add an alias
```
dbt = "docker compose run --rm dbt"
```
to run commands without the docker prefix, e.g., `dbt debug`.


## Database user

dbt connects as `dbt_user`, which can read the Directus schema except for personal data
(names, contact details, IBAN, free-text notes, ...) and owns the `analytics` schema.
Set `DBT_DB_PASSWORD` in `.env` and create/update the user with:
```
docker exec -i directus-db psql -U directus -d directus < analytics/setup/dbt_user.sql
```
Access is granted via an allowlist in the script: to use a new table or column in dbt,
add it there (after checking it holds no personal data) and re-run the script.
Since some columns are hidden, models must select columns explicitly (no `select *`).
