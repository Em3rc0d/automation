FROM postgres:17-alpine

COPY supabase/migrations/ /case001-migrations/
COPY local/db/init.sh /docker-entrypoint-initdb.d/001_case001_migrations.sh
COPY fixtures/seed-staging.sql /docker-entrypoint-initdb.d/900_seed.sql

# Windows/WSL checkouts can introduce CRLF. Normalize the executable init script
# inside the image so PostgreSQL's entrypoint can run it reliably everywhere.
RUN sed -i 's/\r$//' /docker-entrypoint-initdb.d/001_case001_migrations.sh \
    && chmod 0755 /docker-entrypoint-initdb.d/001_case001_migrations.sh
