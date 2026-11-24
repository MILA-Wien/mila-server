SELECT
    id,
    shifts_membership,
    shifts_shift,
    shifts_type,
    shifts_date,
    shifts_score,
    date_created,
    date_updated
FROM {{ source('directus', 'shifts_logs') }}
