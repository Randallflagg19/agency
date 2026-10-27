import type { IncidentCase } from '../src/app/cases/case.model.js';
import type { Pool } from 'pg';
import type { NewCaseData } from './case-create.js';
import type { UploadedCasePhoto } from './cloudinary.js';

// Один запрос даёт согласованный снимок дел, тегов и связей.
// Независимые подзапросы не перемножают теги и связанные дела.
const CASE_COLUMNS = `
  c.id, c.number, c.title, c.description, c.status, c.category,
         c.threat_level AS "threatLevel",
         CASE WHEN c.location_description IS NULL THEN NULL ELSE
           jsonb_build_object(
             'region', c.location_region,
             'description', c.location_description,
             'address', c.location_address
           )
         END AS location,
         c.assignee_id AS "assigneeId",
         to_char(c.registered_at AT TIME ZONE 'UTC',
                 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "registeredAt",
         c.cover_image_url AS "coverImageUrl",
         ARRAY(SELECT t.tag FROM agency.case_tags t
               WHERE t.case_id = c.id ORDER BY t.position) AS tags,
         c.conclusion,
         ARRAY(SELECT r.related_case_id FROM agency.case_relations r
               WHERE r.case_id = c.id ORDER BY r.position) AS "relatedCaseIds"
`;

const SELECT_CASES = `
  SELECT ${CASE_COLUMNS}
  FROM agency.cases c
  ORDER BY c.registered_at DESC, c.id
`;

export async function getCases(pool: Pick<Pool, 'query'>): Promise<readonly IncidentCase[]> {
  const result = await pool.query<IncidentCase>(SELECT_CASES);
  return result.rows;
}

// Один nextval на дело: ID и отображаемый номер строятся из одного значения.
// INSERT и получение результата выполняются одним атомарным SQL-запросом.
const INSERT_CASE = `
  WITH next_number AS (
    SELECT nextval('agency.case_number_seq')::text AS value
  ), formatted_number AS (
    SELECT lpad(value, greatest(4, length(value)), '0') AS number FROM next_number
  ), inserted AS (
    INSERT INTO agency.cases (
      id, number, title, description, status, category, threat_level,
      location_region, location_description, location_address, registered_at,
      cover_image_url, cover_image_public_id, cover_image_asset_id
    )
    SELECT 'case-' || number, number, $1, $2, 'new', $3, $4,
           $5, $6, $7, CURRENT_TIMESTAMP, $8, $9, $10
    FROM formatted_number
    RETURNING *
  )
  SELECT ${CASE_COLUMNS} FROM inserted c
`;

export async function createCase(
  pool: Pick<Pool, 'query'>,
  data: NewCaseData,
  photo: UploadedCasePhoto,
): Promise<IncidentCase> {
  const result = await pool.query<IncidentCase>(INSERT_CASE, [
    data.title,
    data.description,
    data.category,
    data.threatLevel,
    data.location?.region ?? null,
    data.location?.description ?? null,
    data.location?.address ?? null,
    photo.url,
    photo.publicId,
    photo.assetId,
  ]);
  const created = result.rows[0];
  if (!created) throw new Error('INSERT не вернул созданное дело.');
  return created;
}
