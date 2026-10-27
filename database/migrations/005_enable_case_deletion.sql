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
SET LOCAL lock_timeout = '5s';

INSERT INTO agency.schema_migrations (version)
VALUES ('005_enable_case_deletion');

-- Удаляем только дочерние строки, никогда не сами связанные дела.
ALTER TABLE agency.case_tags
  DROP CONSTRAINT case_tags_case_id_fkey,
  ADD CONSTRAINT case_tags_case_id_fkey FOREIGN KEY (case_id)
    REFERENCES agency.cases (id) ON DELETE CASCADE;
ALTER TABLE agency.case_relations
  DROP CONSTRAINT case_relations_case_id_fkey,
  DROP CONSTRAINT case_relations_related_case_id_fkey,
  ADD CONSTRAINT case_relations_case_id_fkey FOREIGN KEY (case_id)
    REFERENCES agency.cases (id) ON DELETE CASCADE,
  ADD CONSTRAINT case_relations_related_case_id_fkey FOREIGN KEY (related_case_id)
    REFERENCES agency.cases (id) ON DELETE CASCADE;

-- Намеренно без FK на cases: задание должно пережить удаление дела.
-- Идентификаторы копирует сервер из DELETE RETURNING, а не из HTTP-запроса.
CREATE TABLE agency.case_photo_cleanup (
  case_id text PRIMARY KEY,
  public_id text NOT NULL CHECK (btrim(public_id) <> ''),
  asset_id text NOT NULL CHECK (btrim(asset_id) <> ''),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX case_photo_cleanup_next_attempt_idx
  ON agency.case_photo_cleanup (next_attempt_at, case_id);

REVOKE ALL PRIVILEGES ON agency.case_photo_cleanup FROM PUBLIC, agency_app;
GRANT SELECT, INSERT, DELETE ON agency.case_photo_cleanup TO agency_app;
GRANT UPDATE (attempts, next_attempt_at) ON agency.case_photo_cleanup TO agency_app;
GRANT DELETE ON agency.cases TO agency_app;

-- Номера, последовательность и право UPDATE на cases не меняются.
COMMENT ON TABLE agency.case_photo_cleanup IS
  'Долговечные задания очистки Cloudinary после удаления дела; без FK на cases.';
COMMENT ON COLUMN agency.cases.cover_image_public_id IS
  'Cloudinary public_id: используется сервером для удаления фотографии вместе с делом.';

COMMIT;
