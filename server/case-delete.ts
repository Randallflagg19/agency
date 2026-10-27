import type { Pool } from 'pg';
import type { CaseDeletionResult } from '../src/app/cases/case-deletion.model.js';

// Один SQL-запрос: DELETE, каскады и задание либо сохраняются вместе, либо откатываются.
// Вызов Cloudinary здесь запрещён: даже потерянный ответ БД не теряет задание.
export async function deleteCase(
  pool: Pick<Pool, 'query'>,
  id: string,
): Promise<CaseDeletionResult> {
  const result = await pool.query<{ id: string; pending: boolean }>(
    `WITH deleted AS (
      DELETE FROM agency.cases WHERE id = $1
      RETURNING id, cover_image_public_id, cover_image_asset_id
    ), queued AS (
      INSERT INTO agency.case_photo_cleanup (case_id, public_id, asset_id)
      SELECT id, cover_image_public_id, cover_image_asset_id FROM deleted
      WHERE cover_image_public_id IS NOT NULL
      RETURNING case_id
    )
    SELECT id, EXISTS (SELECT 1 FROM queued) AS pending FROM deleted`,
    [id],
  );
  const deleted = result.rows[0];
  return {
    id,
    alreadyAbsent: !deleted,
    // При повторе не утверждаем, что фото очищено: прежнее задание могло ещё исполняться.
    photoCleanup: deleted ? (deleted.pending ? 'pending' : 'not_required') : 'unknown',
  };
}
