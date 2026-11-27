-- Creates dbt_user for the Directus database.
-- dbt_user can read tables in public (Directus), owns the analytics schema,
-- and may create tables in public (the dbt_* marts that Directus reads as collections).
-- It can only alter or drop tables it created itself, never the Directus tables.
--
-- Run as the directus superuser (re-runnable):
--   docker exec -i directus-db psql -U directus -d directus < analytics/setup/dbt_user.sql
-- The password is read from the DBT_DB_PASSWORD environment variable.

\set ON_ERROR_STOP on

\getenv dbt_password DBT_DB_PASSWORD
\if :{?dbt_password}
\else
  DO $$ BEGIN RAISE EXCEPTION 'DBT_DB_PASSWORD is not set'; END $$;
\endif

-- Role: a plain login role without any special rights
SELECT 'CREATE ROLE dbt_user LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dbt_user') \gexec
ALTER ROLE dbt_user LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD :'dbt_password';
GRANT CONNECT ON DATABASE directus TO dbt_user;

-- own schema to write staging models
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION dbt_user;

-- public: read all Directus tables, create own tables (marts).
-- Altering or dropping a table requires owning it, so dbt_user can only change the tables it created.
GRANT USAGE, CREATE ON SCHEMA public TO dbt_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dbt_user;
-- also tables Directus creates later (applies to tables created by the role running this script)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dbt_user;
