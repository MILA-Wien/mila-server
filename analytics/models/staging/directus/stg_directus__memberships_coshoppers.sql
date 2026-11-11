select
    id,
    date_created,
    date_updated
from {{ source('directus', 'memberships_coshoppers') }}
