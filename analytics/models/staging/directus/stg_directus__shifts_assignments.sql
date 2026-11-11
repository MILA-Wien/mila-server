select
    id,
    shifts_membership,
    shifts_shift,
    shifts_from,
    shifts_to,
    shifts_is_regular,
    date_created,
    date_updated
from {{ source('directus', 'shifts_assignments') }}
