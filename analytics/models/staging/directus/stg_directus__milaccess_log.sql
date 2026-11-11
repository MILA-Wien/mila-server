select
    id,
    date,
    membership,
    coshopper
from {{ source('directus', 'milaccess_log') }}
