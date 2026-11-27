# MILA Analytics

Data transformation using [data build tool (dbt)](https://github.com/dbt-labs/dbt) v1.

## Setup

dbt connects as `dbt_user`, which can read all tables in the Directus (`public`) schema and owns the `analytics` schema.
It can create tables in `public` (the `dbt_*` marts that Directus reads as collections),
but can only alter or drop the tables it created, not the Directus tables.
dbt grants directus access to its table (see [`dbt_project.yml`](dbt_project.yml)).

- set `DBT_DB_PASSWORD` in `.env`
- create/update the user with:
```
docker exec -i directus-db psql -U directus -d directus < analytics/setup/dbt_user.sql
```

The `dbt` container idles (`sleep infinity`) to be able to run dbt commands
in dev with `docker exec dbt dbt <cmd>` or the Dokploy scheduler in prod.

Check db connection defined in [`profiles.yml`](profiles.yml):
```
docker exec dbt dbt debug
```
Git is only needed to fetch dbt packages from a Git repository.
The related error can be ignored.

## Schedule

In Dokploy mila-server > mila-server-production > schedules set:

| Setting         | Value                                           |
| --------------- | ------------------------------------------------|
| Service name    | `dbt`                                           |
| Task name       | `dbt build`                                     |
| Description     | Weekly build of analytics models and data tests |
| Cron expression | `0 20 * * 6` (Saturdays at 20:00)               |
| Time zone       | `Europe/Vienna`                                 |
| Command         | `dbt build`                                     |

