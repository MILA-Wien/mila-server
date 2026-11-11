select
    id,
    name,
    date,
    date_created,
    date_updated
from {{ source('directus', 'shifts_holidays_public') }}
