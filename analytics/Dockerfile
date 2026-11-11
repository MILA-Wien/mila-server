FROM python:3.13-slim

RUN pip install --no-cache-dir dbt-core==1.12.6 dbt-postgres==1.11.0

WORKDIR /usr/app
# Use the profiles.yml in this project instead of the default ~/.dbt/profiles.yml
ENV DBT_PROFILES_DIR=/usr/app

ENTRYPOINT ["dbt"]
