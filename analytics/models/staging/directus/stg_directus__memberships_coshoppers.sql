SELECT
    id,
    date_created,
    date_updated
FROM {{ source('directus', 'memberships_coshoppers') }}
