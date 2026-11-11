-- Creates the read-only dbt_user for the Directus database.
-- dbt_user can read only the public (Directus) columns in the allowlist below,
-- and owns the analytics schema that dbt writes to.
--
-- Run as the directus superuser (re-runnable, e.g. after Directus schema changes):
--   docker exec -i directus-db psql -U directus -d directus < analytics/setup/dbt_user.sql
-- The password is read from the DBT_DB_PASSWORD environment variable.
--
-- To expose a new column, add it to the allowlist after checking it holds no
-- personal data (names, contact details, birthday, IBAN, free-text notes, ...).
-- Allowlisted columns that no longer exist are skipped with a notice.

\set ON_ERROR_STOP on

\getenv dbt_password DBT_DB_PASSWORD
\if :{?dbt_password}
\else
  DO $$ BEGIN RAISE EXCEPTION 'DBT_DB_PASSWORD is not set'; END $$;
\endif

-- Role
SELECT 'CREATE ROLE dbt_user LOGIN'
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dbt_user') \gexec
ALTER ROLE dbt_user LOGIN PASSWORD :'dbt_password';
GRANT CONNECT ON DATABASE directus TO dbt_user;

-- dbt writes its models into its own schema
CREATE SCHEMA IF NOT EXISTS analytics AUTHORIZATION dbt_user;

-- Read access to allowlisted columns in public
GRANT USAGE ON SCHEMA public TO dbt_user;

DO $$
DECLARE
  t record;
  cols text;
  missing text;
BEGIN
  -- start from scratch so removed columns/tables lose their grants
  REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM dbt_user;

  FOR t IN
    SELECT * FROM (VALUES
      -- Directus system tables
      ('directus_users', ARRAY[
        'id', 'buddy_status', 'memberships_postcode', 'memberships_gender',
        'memberships_organization_type', 'memberships_person_type',
        'mila_skills_2', 'survey_languages']),

      -- memberships
      ('memberships', ARRAY[
        'id', 'memberships_user', 'memberships_type', 'memberships_status',
        'memberships_shares', 'membership_approved_by_board', 'memberships_date_applied',
        'memberships_date_approved', 'memberships_date_cancelled', 'memberships_date_ended',
        'memberships_date_excluded', 'memberships_date_type_changed',
        'memberships_card_check_status', 'memberships_card_checked_at',
        'activation_do_not_call', 'activation_do_not_survey',
        'activation_frozen_since', 'activation_last_call', 'activation_last_call_successfull',
        'activation_last_shop', 'activation_survey_choice', 'activation_survey_date',
        'shifts_counter', 'shifts_orientation_date', 'shifts_user_type',
        'date_created', 'date_updated']),
      ('memberships_coshoppers', ARRAY['id', 'date_created', 'date_updated']),
      -- junction for memberships.coshoppers
      ('memberships_memberships_coshoppers', ARRAY['id', 'memberships_id', 'memberships_coshoppers_id']),
      -- junction for memberships.kids
      ('memberships_memberships_coshoppers_1', ARRAY['id', 'memberships_id', 'memberships_coshoppers_id']),
      ('memberships_shifts_categories', ARRAY['id', 'memberships_id', 'shifts_categories_id']),
      ('memberships_shifts_skills', ARRAY['id', 'memberships_id', 'shifts_skills_id']),
      ('milaccess_log', ARRAY['id', 'date', 'membership', 'coshopper']),

      -- shifts
      ('shifts_absences', ARRAY[
        'id', 'shifts_membership', 'shifts_assignment', 'shifts_from', 'shifts_to',
        'shifts_is_holiday', 'shifts_is_for_all_assignments', 'date_created', 'date_updated']),
      ('shifts_assignments', ARRAY[
        'id', 'shifts_membership', 'shifts_shift', 'shifts_from', 'shifts_to', 'shifts_is_regular',
        'date_created', 'date_updated']),
      ('shifts_categories', ARRAY['id', 'name', 'for_all']),
      ('shifts_holidays_public', ARRAY['id', 'name', 'date', 'date_created', 'date_updated']),
      ('shifts_logs', ARRAY[
        'id', 'shifts_membership', 'shifts_shift', 'shifts_type', 'shifts_date', 'shifts_score',
        'date_created', 'date_updated']),
      ('shifts_shifts', ARRAY[
        'id', 'shifts_name', 'shifts_category_2', 'shifts_status',
        'shifts_from', 'shifts_to', 'shifts_from_time', 'shifts_to_time', 'shifts_is_all_day',
        'shifts_is_regular', 'shifts_repeats_every', 'shifts_slots', 'shift_points',
        'shifts_allow_self_assignment', 'exclude_public_holidays',
        'date_created', 'date_updated']),
      ('shifts_skills', ARRAY['id', 'name_de', 'name_en'])
    ) AS allowlist(table_name, columns)
  LOOP
    SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = t.table_name
      AND column_name = ANY (t.columns);

    SELECT string_agg(c, ', ') INTO missing
    FROM unnest(t.columns) AS c
    WHERE NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = c
    );
    IF missing IS NOT NULL THEN
      RAISE NOTICE 'Skipping missing columns in %: %', t.table_name, missing;
    END IF;

    IF cols IS NOT NULL THEN
      EXECUTE format('GRANT SELECT (%s) ON public.%I TO dbt_user', cols, t.table_name);
    END IF;
  END LOOP;
END $$;
