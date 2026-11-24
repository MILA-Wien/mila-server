SELECT
    id,
    memberships_id,
    shifts_categories_id
FROM {{ source('directus', 'memberships_shifts_categories') }}
