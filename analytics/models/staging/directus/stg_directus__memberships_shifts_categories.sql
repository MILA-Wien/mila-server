select
    id,
    memberships_id,
    shifts_categories_id
from {{ source('directus', 'memberships_shifts_categories') }}
