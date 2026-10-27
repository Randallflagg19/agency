import type { Pool } from 'pg';
import type { CasePhotoStorage } from './case-upload.js';

type CleanupJob = { case_id: string; public_id: string };

// Короткая партия ограничивает нагрузку. Блокировка не даёт двум API одновременно
// обрабатывать задание; при падении процесса PostgreSQL откатит незавершённую работу.
export async function cleanupCasePhotos(
  pool: Pool,
  photos: Pick<CasePhotoStorage, 'delete'>,
): Promise<void> {
  for (let index = 0; index < 5; index++) {
    const client = await pool.connect();
    let discard = false;
    try {
      await client.query('BEGIN');
      const { rows } = await client.query<CleanupJob>(
        `SELECT case_id, public_id FROM agency.case_photo_cleanup
         WHERE next_attempt_at <= CURRENT_TIMESTAMP
         ORDER BY next_attempt_at, case_id LIMIT 1 FOR UPDATE SKIP LOCKED`,
      );
      const job = rows[0];
      if (!job) {
        await client.query('COMMIT');
        return;
      }

      let cleaned = false;
      try {
        // deleteCasePhoto принимает также ответ Cloudinary «not found» как успех.
        await photos.delete(job.public_id);
        cleaned = true;
      } catch {
        console.error('Очистка фотографии отложена; задание сохранено:', job.case_id);
      }
      if (cleaned) {
        await client.query('DELETE FROM agency.case_photo_cleanup WHERE case_id = $1', [
          job.case_id,
        ]);
      } else {
        await client.query(
          `UPDATE agency.case_photo_cleanup
           SET attempts = attempts + 1,
               next_attempt_at = clock_timestamp()
                 + LEAST(3600, 30 * power(2, LEAST(attempts, 7))) * INTERVAL '1 second'
           WHERE case_id = $1`,
          [job.case_id],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        discard = true;
      }
      throw error;
    } finally {
      client.release(discard);
    }
  }
}

// Без внешнего брокера: очередь хранится в PostgreSQL, обработчик живёт в API.
export function startCasePhotoCleanup(pool: Pool, photos: Pick<CasePhotoStorage, 'delete'>) {
  let running: Promise<void> | undefined;
  const run = () => {
    if (running) return;
    running = cleanupCasePhotos(pool, photos)
      .catch(() => console.error('Не удалось обработать очередь фотографий; повторим позже.'))
      .finally(() => {
        running = undefined;
      });
  };
  const timer = setInterval(run, 30000);
  timer.unref();
  run();
  return async () => {
    clearInterval(timer);
    await running;
  };
}
