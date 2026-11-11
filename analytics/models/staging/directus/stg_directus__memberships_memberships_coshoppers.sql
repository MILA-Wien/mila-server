select
    id,
    memberships_id,
    memberships_coshoppers_id
from {{ source('directus', 'memberships_memberships_coshoppers') }}
