\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF current_database() <> 'agency_db' THEN
    RAISE EXCEPTION 'Migration requires database agency_db';
  END IF;
END
$$;

SET LOCAL ROLE agency_owner;

INSERT INTO agency.schema_migrations (version)
VALUES ('003_enable_case_creation');

-- Чтение доступно, записи ждут завершения настройки нумерации.
LOCK TABLE agency.cases IN SHARE ROW EXCLUSIVE MODE;

-- Не угадываем следующий номер, если формат существующих данных изменился.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM agency.cases
    WHERE number !~ '^[0-9]+$' OR id <> 'case-' || number
  ) THEN
    RAISE EXCEPTION 'Expected numeric case numbers and matching case-<number> IDs';
  END IF;
END
$$;

CREATE SEQUENCE agency.case_number_seq AS bigint MINVALUE 1 NO CYCLE;
ALTER SEQUENCE agency.case_number_seq OWNED BY agency.cases.number;

-- false: первый nextval вернёт именно max + 1; для пустого архива — 1.
SELECT setval(
  'agency.case_number_seq',
  (SELECT COALESCE(MAX(number::bigint), 0) + 1 FROM agency.cases),
  false
);

GRANT USAGE ON SEQUENCE agency.case_number_seq TO agency_app;
GRANT INSERT ON agency.cases TO agency_app;

-- API получит nextval один раз и построит из него number и id.
-- DEFAULT для обоих столбцов мог бы расходовать два разных номера.
COMMIT;
