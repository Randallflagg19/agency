\set ON_ERROR_STOP on

-- Только чтение: схема, права, количество строк и состояние последовательности.
BEGIN READ ONLY;

DO $$
BEGIN
  IF current_database() <> 'agency_db' THEN
    RAISE EXCEPTION 'Check requires database agency_db';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM agency.schema_migrations WHERE version = '005_enable_case_deletion'
  ) THEN
    RAISE EXCEPTION 'Migration 005 is missing';
  END IF;
  IF (SELECT count(*) FROM pg_constraint
      WHERE conrelid IN ('agency.case_tags'::regclass, 'agency.case_relations'::regclass)
        AND contype = 'f' AND confrelid = 'agency.cases'::regclass AND confdeltype = 'c') <> 3 THEN
    RAISE EXCEPTION 'Expected three ON DELETE CASCADE foreign keys';
  END IF;
  IF NOT has_table_privilege('agency_app', 'agency.cases', 'DELETE')
     OR has_any_column_privilege('agency_app', 'agency.cases', 'UPDATE')
     OR has_table_privilege('agency_app', 'agency.case_tags', 'DELETE')
     OR has_table_privilege('agency_app', 'agency.case_relations', 'DELETE') THEN
    RAISE EXCEPTION 'Unexpected case deletion privileges';
  END IF;
  IF NOT has_table_privilege('agency_app', 'agency.case_photo_cleanup', 'SELECT')
     OR NOT has_table_privilege('agency_app', 'agency.case_photo_cleanup', 'INSERT')
     OR NOT has_table_privilege('agency_app', 'agency.case_photo_cleanup', 'DELETE')
     OR NOT has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'attempts', 'UPDATE')
     OR NOT has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'next_attempt_at', 'UPDATE')
     OR has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'public_id', 'UPDATE')
     OR has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'asset_id', 'UPDATE')
     OR has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'case_id', 'UPDATE')
     OR has_column_privilege('agency_app', 'agency.case_photo_cleanup', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'Unexpected photo cleanup privileges';
  END IF;
END
$$;

SELECT version, applied_at FROM agency.schema_migrations ORDER BY version;
SELECT 'cases' AS object, count(*) AS rows FROM agency.cases
UNION ALL SELECT 'case_tags', count(*) FROM agency.case_tags
UNION ALL SELECT 'case_relations', count(*) FROM agency.case_relations
UNION ALL SELECT 'case_photo_cleanup', count(*) FROM agency.case_photo_cleanup;
SELECT last_value, is_called FROM agency.case_number_seq;
SELECT conrelid::regclass AS child_table, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN ('agency.case_tags'::regclass, 'agency.case_relations'::regclass)
  AND contype = 'f'
ORDER BY child_table, conname;
SELECT case_id, attempts, created_at, next_attempt_at
FROM agency.case_photo_cleanup ORDER BY next_attempt_at, case_id;

COMMIT;
