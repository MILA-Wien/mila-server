-- Test mart for Directus Insights: number of memberships and shares per status.
{{ config(
    post_hook="alter table {{ this }} add primary key (memberships_status)"
) }}

select
    coalesce(memberships_status, 'unknown') as memberships_status,
    count(*) as memberships_count,
    coalesce(sum(memberships_shares), 0) as memberships_shares_total
from {{ ref('stg_directus__memberships') }}
group by 1
