SELECT
    id,
    memberships_id,
    shifts_skills_id
FROM {{ source('directus', 'memberships_shifts_skills') }}
