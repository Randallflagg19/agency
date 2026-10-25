import type { IncidentCase } from '../src/app/cases/case.model.js';
import type { Pool } from 'pg';

// Один запрос даёт согласованный снимок дел, тегов и связей.
// Независимые подзапросы не перемножают теги и связанные дела.
const SELECT_CASES = `
  SELECT c.id, c.number, c.title, c.description, c.status, c.category,
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
  FROM agency.cases c
  ORDER BY c.registered_at DESC, c.id
`;

export async function getCases(pool: Pool): Promise<readonly IncidentCase[]> {
  const result = await pool.query<IncidentCase>(SELECT_CASES);
  return result.rows;
}
