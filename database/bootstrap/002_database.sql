\set ON_ERROR_STOP on

-- Только первичная подготовка. На текущем VPS база уже создана.
-- CREATE DATABASE не допускается внутри транзакции. Если имя занято,
-- psql остановится, не меняя существующую базу.
CREATE DATABASE agency_db
  OWNER agency_owner TEMPLATE template0 ENCODING 'UTF8';

\connect agency_db

BEGIN;
REVOKE ALL PRIVILEGES ON DATABASE agency_db FROM PUBLIC;
GRANT CONNECT ON DATABASE agency_db TO agency_app;
REVOKE ALL PRIVILEGES ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA agency AUTHORIZATION agency_owner;
GRANT USAGE ON SCHEMA agency TO agency_app;
COMMIT;
