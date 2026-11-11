select
    id,
    name,
    for_all
from {{ source('directus', 'shifts_categories') }}
