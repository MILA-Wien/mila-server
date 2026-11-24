-- Relative frequencies of the monthly shopping frequency histogram:
-- share of shoppers per visit bucket within each shopper type.
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (id)"
) }}

SELECT
    id,
    month,
    shopper_type,
    visit_count,
    -- Percent of all shoppers of this type; buckets of one type sum to 100.
    ROUND(
        100.0 * shopper_count
        / NULLIF(SUM(shopper_count) OVER (PARTITION BY shopper_type), 0),
        1
    ) AS shopper_share
FROM {{ ref('dbt_monthly_visit_freq_abs') }}
