SELECT
    id,
    name,
    for_all
FROM {{ source('directus', 'shifts_categories') }}
