FROM postgres:17-alpine

COPY scripts/db/setup.sql /docker-entrypoint-initdb.d/010-setup.sql
COPY scripts/db/schema.sql /docker-entrypoint-initdb.d/020-schema.sql
