#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER obrigatória}"
: "${POSTGRES_DB:?POSTGRES_DB obrigatória}"
: "${MIGRATOR_DB_PASSWORD:?MIGRATOR_DB_PASSWORD obrigatória}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD obrigatória}"
: "${OBSERVER_DB_PASSWORD:?OBSERVER_DB_PASSWORD obrigatória}"

psql --no-psqlrc --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=ON_ERROR_STOP=1 \
  --set=database="$POSTGRES_DB" \
  --set=migrator_password="$MIGRATOR_DB_PASSWORD" \
  --set=app_password="$APP_DB_PASSWORD" \
  --set=observer_password="$OBSERVER_DB_PASSWORD" <<'SQL'
BEGIN;

SELECT 'CREATE ROLE rental_migrator LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rental_migrator')
\gexec
SELECT 'CREATE ROLE rental_app LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rental_app')
\gexec
SELECT 'CREATE ROLE rental_observer LOGIN'
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rental_observer')
\gexec

ALTER ROLE rental_migrator PASSWORD :'migrator_password';
ALTER ROLE rental_app PASSWORD :'app_password';
ALTER ROLE rental_observer PASSWORD :'observer_password';

REVOKE ALL ON DATABASE :"database" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"database" TO rental_migrator, rental_app, rental_observer;
GRANT CREATE ON DATABASE :"database" TO rental_migrator;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO rental_migrator;
ALTER DEFAULT PRIVILEGES FOR ROLE rental_migrator REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

COMMIT;
SQL
