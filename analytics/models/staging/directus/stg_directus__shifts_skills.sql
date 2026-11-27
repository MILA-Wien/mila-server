SELECT
    id,
    name_de,
    name_en
FROM {{ source('directus', 'shifts_skills') }}
