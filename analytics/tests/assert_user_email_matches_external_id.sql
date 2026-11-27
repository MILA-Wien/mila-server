-- Keycloak users log in via their email, so a Directus flow keeps
-- external_identifier in sync with email (collectivo/server/api/user_sync_keycloak.post.ts).
-- Fails for every Keycloak user where the two differ.
SELECT id
FROM {{ source('directus', 'directus_users') }}
WHERE provider = 'keycloak'
  AND email IS DISTINCT FROM external_identifier
