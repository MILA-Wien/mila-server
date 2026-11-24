SELECT
    id,
    memberships_id,
    memberships_coshoppers_id
FROM {{ source('directus', 'memberships_memberships_coshoppers_1') }}
