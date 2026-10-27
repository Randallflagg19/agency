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
VALUES ('004_add_case_photo_identifiers');

-- У старых дел идентификаторов Cloudinary нет: их URL остаются как есть.
ALTER TABLE agency.cases
  ADD COLUMN cover_image_public_id text,
  ADD COLUMN cover_image_asset_id text,
  ADD CONSTRAINT cases_cover_image_identifiers_consistent CHECK (
    (
      cover_image_public_id IS NULL
      AND cover_image_asset_id IS NULL
    )
    OR (
      cover_image_public_id IS NOT NULL
      AND cover_image_asset_id IS NOT NULL
      AND cover_image_url IS NOT NULL
      AND btrim(cover_image_public_id) <> ''
      AND btrim(cover_image_asset_id) <> ''
      AND btrim(cover_image_url) <> ''
    )
  );

COMMENT ON COLUMN agency.cases.cover_image_public_id IS
  'Cloudinary public_id: используется сервером для удаления и замены фотографии.';
COMMENT ON COLUMN agency.cases.cover_image_asset_id IS
  'Cloudinary asset_id: постоянный идентификатор ресурса.';

-- SELECT и INSERT уже выданы на таблицу целиком и действуют на новые столбцы.
-- Права UPDATE/DELETE эта миграция не добавляет.
COMMIT;
