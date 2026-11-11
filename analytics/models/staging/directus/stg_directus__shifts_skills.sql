select
    id,
    name_de,
    name_en
from {{ source('directus', 'shifts_skills') }}
