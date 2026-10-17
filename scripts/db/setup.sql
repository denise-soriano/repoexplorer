\set ON_ERROR_STOP on

-- During image initialization, the official Postgres entrypoint connects as
-- POSTGRES_USER. APPLICATION_* lets manual reruns keep those admin connection
-- credentials separate from the application role credentials.
\getenv application_user APPLICATION_USER
\if :{?application_user}
\else
    \getenv application_user PGUSER
\endif

\getenv application_password APPLICATION_PASSWORD
\if :{?application_password}
\else
    \getenv application_password PGPASSWORD
\endif

\if :{?application_user}
\else
    \echo 'Set APPLICATION_USER or PGUSER to the application role name.'
    \quit 1
\endif

\if :{?application_password}
\else
    \echo 'Set APPLICATION_PASSWORD or PGPASSWORD to the application role password.'
    \quit 1
\endif

SELECT current_user <> :'application_user'
    AND :'application_user' <> ''
    AND :'application_password' <> '' AS application_credentials_are_valid
\gset
\if :application_credentials_are_valid
\else
    \echo 'Application credentials must be non-empty and the role must differ from the database administrator.'
    \quit 1
\endif

SELECT format(
    'CREATE ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
    :'application_user',
    :'application_password'
)
WHERE NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname = :'application_user'
) \gexec

SELECT format(
    'ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L',
    :'application_user',
    :'application_password'
) \gexec

SELECT format(
    'GRANT CONNECT, TEMPORARY ON DATABASE %I TO %I',
    current_database(),
    :'application_user'
) \gexec

SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'application_user') \gexec
SELECT format(
    'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I',
    :'application_user'
) \gexec
SELECT format(
    'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',
    :'application_user'
) \gexec

-- Initialization and documented reruns create objects as POSTGRES_USER. Set
-- defaults for that actual owner so later tables and sequences are accessible.
SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
    current_user,
    :'application_user'
) \gexec
SELECT format(
    'ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
    current_user,
    :'application_user'
) \gexec
