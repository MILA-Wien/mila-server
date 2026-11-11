select
    id,
    buddy_status,
    memberships_postcode,
    memberships_gender,
    memberships_organization_type,
    memberships_person_type,
    mila_skills_2,
    survey_languages
from {{ source('directus', 'directus_users') }}
