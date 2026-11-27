SELECT
    id,
    date,
    DATE_TRUNC('week', date)::DATE AS week,
    membership,
    coshopper,
    -- whether the shopper is a member or coshopper
    CASE
        WHEN coshopper IS NULL THEN 'member'
        ELSE 'coshopper'
    END AS shopper_type,
    -- The person who checked in: the member themselves, or the co-shopper.
    CASE
        WHEN coshopper IS NULL THEN membership::TEXT
        ELSE coshopper::TEXT
    END AS shopper
FROM {{ source('directus', 'milaccess_log') }}
-- Last 6 months, starting on a Monday so the first week is complete.
WHERE date >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '6 months')
