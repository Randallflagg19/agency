\set ON_ERROR_STOP on

BEGIN;

-- Выполнять через psql, подключившись именно к agency_db.
DO $$
BEGIN
  IF current_database() <> 'agency_db' THEN
    RAISE EXCEPTION 'Migration requires database agency_db';
  END IF;
END
$$;

SET LOCAL ROLE agency_owner;

CREATE TABLE IF NOT EXISTS agency.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Повторное применение завершится ошибкой до изменения таблиц дел.
INSERT INTO agency.schema_migrations (version)
VALUES ('001_create_case_tables');

CREATE TABLE agency.cases (
  id text PRIMARY KEY CHECK (btrim(id) <> ''),
  number text NOT NULL UNIQUE CHECK (btrim(number) <> ''),
  title text NOT NULL CHECK (btrim(title) <> ''),
  description text NOT NULL,
  status text NOT NULL CHECK (status IN (
    'new', 'investigating', 'suspended', 'closed'
  )),
  category text NOT NULL CHECK (category IN (
    'unknown', 'acoustic', 'visual', 'telecommunication',
    'disappearance', 'spatial', 'physical'
  )),
  threat_level smallint CHECK (threat_level BETWEEN 1 AND 5),
  location_region text,
  location_description text,
  location_address text,
  assignee_id text,
  registered_at timestamptz NOT NULL,
  cover_image_url text,
  conclusion text,
  -- NULL description означает отсутствие объекта location целиком.
  CONSTRAINT cases_location_consistent CHECK (
    location_description IS NOT NULL
    OR (location_region IS NULL AND location_address IS NULL)
  )
);

CREATE TABLE agency.case_tags (
  case_id text NOT NULL REFERENCES agency.cases (id),
  tag text NOT NULL CHECK (btrim(tag) <> ''),
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (case_id, tag),
  UNIQUE (case_id, position)
);

CREATE TABLE agency.case_relations (
  case_id text NOT NULL REFERENCES agency.cases (id),
  related_case_id text NOT NULL REFERENCES agency.cases (id),
  position integer NOT NULL CHECK (position >= 0),
  PRIMARY KEY (case_id, related_case_id),
  UNIQUE (case_id, position),
  CHECK (case_id <> related_case_id)
);

CREATE INDEX case_relations_related_case_id_idx
  ON agency.case_relations (related_case_id);

GRANT SELECT ON agency.cases, agency.case_tags, agency.case_relations
  TO agency_app;

COMMIT;
