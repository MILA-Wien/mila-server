select
    id,
    memberships_id,
    shifts_skills_id
from {{ source('directus', 'memberships_shifts_skills') }}
