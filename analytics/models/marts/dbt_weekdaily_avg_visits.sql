-- Average number of visits (check-ins) per weekday and shopper type over the last 4 weeks
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (id)"
) }}

WITH daily AS (
    SELECT
        date,
        shopper_type,
        COUNT(*) AS visit_count
    FROM {{ ref('stg_directus__access_log') }}
    WHERE date > CURRENT_DATE - 28
    GROUP BY date, shopper_type
),

open_days AS (
    -- Fewer than 10 visits in total means the shop was closed
    SELECT date
    FROM daily
    GROUP BY date
    HAVING SUM(visit_count) >= 10
),

weekdaily AS (
    SELECT
        -- Prefixed with the ISO weekday number ("1 Monday") so Directus charts sort Monday first.
        TO_CHAR(o.date, 'ID FMDay') AS weekday_name,
        -- ISO weekday number (1 = Monday … 7 = Sunday) as numeric x-axis for Directus charts.
        EXTRACT(ISODOW FROM o.date)::INTEGER AS weekday,
        t.shopper_type,
        -- Open days without visits of this shopper type count as 0.
        ROUND(AVG(COALESCE(d.visit_count, 0)), 1) AS average_visit_count
    FROM open_days AS o
    CROSS JOIN (VALUES ('member'), ('coshopper')) AS t (shopper_type)
    LEFT JOIN daily AS d
        ON d.date = o.date
        AND d.shopper_type = t.shopper_type
    GROUP BY weekday_name, weekday, t.shopper_type
)

SELECT
    weekday_name || '_' || shopper_type AS id,
    weekday,
    weekday_name,
    shopper_type,
    average_visit_count
FROM weekdaily
