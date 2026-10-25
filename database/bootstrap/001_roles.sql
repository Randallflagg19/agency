\set ON_ERROR_STOP on

-- Только первичная подготовка. На текущем VPS роли уже созданы.
-- Если имя занято, операция завершится ошибкой без изменения существующих ролей.
BEGIN;
CREATE ROLE agency_owner
  NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE agency_app
  LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
COMMIT;
