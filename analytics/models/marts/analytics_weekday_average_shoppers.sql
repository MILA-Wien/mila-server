-- Average number of shoppers per weekday over the last 4 weeks
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (weekday_name)"
) }}

WITH daily AS (
    SELECT
        date,
        COUNT(*) AS shopper_count
    FROM {{ ref('stg_directus__access_log') }}
    WHERE date > CURRENT_DATE - 28
    GROUP BY date
)

SELECT
    -- Prefixed with the ISO weekday number ("1 Monday") so Directus charts sort Monday first.
    TO_CHAR(date, 'ID FMDay') AS weekday_name,
    ROUND(AVG(shopper_count), 1) AS average_shopper_count
FROM daily
GROUP BY weekday_name
