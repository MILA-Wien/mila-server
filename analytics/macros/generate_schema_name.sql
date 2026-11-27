{#
  Use a model's custom schema as-is instead of dbt's default "<target_schema>_<custom_schema>".
  Models without a custom schema go to the target schema (analytics); marts set
  schema "public" so Directus can read them as collections.
#}
{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
