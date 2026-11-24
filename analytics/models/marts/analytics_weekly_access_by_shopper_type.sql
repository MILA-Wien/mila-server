-- Number of shop check-ins per week, split into members and co-shoppers.
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (id)"
) }}

SELECT
    week::TEXT || '_' || shopper_type AS id,
    week,
    shopper_type,
    -- defaults to BIGINT which is not supported by aggregations in directus insights
    -- setting aggregation is required for valid graphql query in line chart
    COUNT(*)::INTEGER AS access_count
FROM {{ ref('stg_directus__access_log') }}
GROUP BY week, shopper_type
