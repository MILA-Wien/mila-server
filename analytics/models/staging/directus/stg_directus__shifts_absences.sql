select
    id,
    shifts_membership,
    shifts_assignment,
    shifts_from,
    shifts_to,
    shifts_is_holiday,
    shifts_is_for_all_assignments,
    date_created,
    date_updated
from {{ source('directus', 'shifts_absences') }}
