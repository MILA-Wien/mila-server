-- Histogram of shop visits per shopper in the last complete month, split into
-- members and co-shoppers. Includes potential shoppers who did not shop (0 visits).
{{ config(
    post_hook="ALTER TABLE {{ this }} ADD PRIMARY KEY (id)"
) }}

WITH period AS (
    SELECT
        (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE AS month_start,
        (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::DATE AS month_end
),

visits AS (
    -- Each access log row is one check-in, i.e. one visit.
SELECT
        a.shopper_type,
        a.shopper,
        COUNT(*) AS visits
    FROM {{ ref('stg_directus__access_log') }} AS a
    CROSS JOIN period AS p
    WHERE a.date BETWEEN p.month_start AND p.month_end
    GROUP BY a.shopper_type, a.shopper
),

eligible_members AS (
    -- Active members approved by the start of the month and not ended or excluded before it.
    SELECT m.id
    FROM {{ ref('stg_directus__memberships') }} AS m
    CROSS JOIN period AS p
    WHERE m.memberships_type = 'Aktiv'
        AND m.memberships_date_approved <= p.month_start
        AND (
            COALESCE(m.memberships_date_ended, m.memberships_date_excluded) IS NULL
            OR COALESCE(m.memberships_date_ended, m.memberships_date_excluded) >= p.month_start
        )
),

eligible_coshoppers AS (
    -- Co-shoppers (not kids) of eligible members, created by the start of the month.
    SELECT DISTINCT c.id
    FROM eligible_members AS m
    INNER JOIN {{ ref('stg_directus__memberships_memberships_coshoppers') }} AS j
        ON j.memberships_id = m.id
    INNER JOIN {{ ref('stg_directus__memberships_coshoppers') }} AS c
        ON c.id = j.memberships_coshoppers_id
    CROSS JOIN period AS p
    WHERE c.date_created <= p.month_start
),

shoppers AS (
    -- Eligible shoppers plus everyone who shopped, so the 1+ buckets match the access log.
    SELECT 'member' AS shopper_type, id::TEXT AS shopper FROM eligible_members
    UNION
    SELECT 'coshopper', id::TEXT FROM eligible_coshoppers
    UNION
    SELECT shopper_type, shopper FROM visits
),

counts AS (
    SELECT
        s.shopper_type,
        -- 10 means 10 or more
        LEAST(COALESCE(v.visits, 0), 10) AS visit_count,
        COUNT(*) AS shopper_count
    FROM shoppers AS s
    LEFT JOIN visits AS v
        ON v.shopper_type = s.shopper_type
        AND v.shopper = s.shopper
    GROUP BY 1, 2
),

grid AS (
    -- Every shopper type and bucket, so empty bars are present as 0.
    SELECT t.shopper_type, b.visit_count
    FROM (VALUES ('member'), ('coshopper')) AS t (shopper_type)
    CROSS JOIN GENERATE_SERIES(0, 10) AS b (visit_count)
)

SELECT
    g.shopper_type || '_' || g.visit_count AS id,
    p.month_start AS month,
    g.shopper_type,
    g.visit_count,
    -- defaults to BIGINT which is not supported by aggregations in directus insights
    COALESCE(c.shopper_count, 0)::INTEGER AS shopper_count
FROM grid AS g
CROSS JOIN period AS p
LEFT JOIN counts AS c
    ON c.shopper_type = g.shopper_type
    AND c.visit_count = g.visit_count
