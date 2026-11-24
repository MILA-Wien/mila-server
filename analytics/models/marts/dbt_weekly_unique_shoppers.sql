-- Number of distinct members and co-shoppers who checked in per week.
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (id)"
) }}

SELECT
    week::TEXT || '_' || shopper_type AS id,
    week,
    shopper_type,
    -- defaults to BIGINT which is not supported by aggregations in directus insights
    -- setting aggregation is required for valid graphql query in line chart
    COUNT(DISTINCT shopper)::INTEGER AS unique_shopper_count
FROM {{ ref('stg_directus__access_log') }}
GROUP BY week, shopper_type
