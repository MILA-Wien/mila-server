SELECT
    id,
    name,
    date,
    date_created,
    date_updated
FROM {{ source('directus', 'shifts_holidays_public') }}
