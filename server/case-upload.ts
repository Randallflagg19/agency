import type { IncomingMessage } from 'node:http';
import type { Pool, PoolClient } from 'pg';
import sharp from 'sharp';
import { parseCaseCreateBody, type NewCaseData } from './case-create.js';
import { createCase } from './cases.js';
import {
  deleteCasePhoto,
  getCloudinaryFolderMode,
  uploadCasePhoto,
  type CloudinaryFolderMode,
  type UploadedCasePhoto,
} from './cloudinary.js';
import { HttpError, readBody } from './http.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_DRAFT_BYTES = 128 * 1024;
const MAX_REQUEST_BYTES = MAX_PHOTO_BYTES + MAX_DRAFT_BYTES + 16 * 1024;

export interface CasePhotoStorage {
  upload(file: Buffer): Promise<UploadedCasePhoto>;
  delete(publicId: string): Promise<void>;
}

export function createCasePhotoStorage(): CasePhotoStorage {
  let folderMode: Promise<CloudinaryFolderMode> | undefined;
  return {
    async upload(file) {
      // Повторяем проверку после сбоя, но сохраняем успешный результат.
      folderMode ??= getCloudinaryFolderMode().catch((error: unknown) => {
        folderMode = undefined;
        throw error;
      });
      return uploadCasePhoto(file, await folderMode);
    },
    delete: deleteCasePhoto,
  };
}

export async function readCaseUpload(request: IncomingMessage) {
  const contentType = request.headers['content-type'] ?? '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) {
    throw new HttpError(415, 'Ожидается форма с полями draft и photo.');
  }
  // Ограничиваем байты до разбора multipart, включая запросы без Content-Length.
  const body = await readBody(request, MAX_REQUEST_BYTES);
  let form: FormData;
  try {
    form = await new Response(new Uint8Array(body), {
      headers: { 'Content-Type': contentType },
    }).formData();
  } catch {
    throw new HttpError(400, 'Некорректная multipart-форма.');
  }
  const entries = [...form.entries()];
  const draft = form.get('draft');
  const photo = form.get('photo');
  if (
    entries.length !== 2 ||
    form.getAll('draft').length !== 1 ||
    form.getAll('photo').length !== 1 ||
    typeof draft !== 'string' ||
    !(photo instanceof File)
  ) {
    throw new HttpError(400, 'Нужны один черновик draft и одна фотография photo.');
  }
  if (Buffer.byteLength(draft) > MAX_DRAFT_BYTES || photo.size > MAX_PHOTO_BYTES) {
    throw new HttpError(413, 'Фотография — до 5 МиБ, текстовые данные — до 128 КиБ.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(draft) as unknown;
  } catch {
    throw new HttpError(400, 'Черновик должен содержать корректный JSON.');
  }
  const data = parseCaseCreateBody(parsed);
  const file = Buffer.from(await photo.arrayBuffer());
  // Проверяем содержимое, не доверяя имени и MIME-типу от браузера.
  try {
    const image = sharp(file, { limitInputPixels: 25_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format) || (metadata.pages ?? 1) !== 1) {
      throw new Error('Unsupported image');
    }
    // metadata читает только заголовок; stats декодирует пиксели и выявляет повреждения.
    await image.stats();
  } catch {
    throw new HttpError(
      400,
      'Выберите исправную фотографию JPEG, PNG или WebP без анимации, до 25 мегапикселей.',
    );
  }
  return { data, file };
}

export async function createCaseWithPhoto(
  pool: Pick<Pool, 'connect'>,
  data: NewCaseData,
  file: Buffer,
  storage: CasePhotoStorage,
) {
  let photo: UploadedCasePhoto;
  try {
    photo = await storage.upload(file);
  } catch {
    throw new HttpError(503, 'Не удалось загрузить фотографию. Дело не создано.');
  }

  let client: PoolClient | undefined;
  let insertStarted = false;
  let commitStarted = false;
  let discardConnection = false;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    insertStarted = true;
    const created = await createCase(client, data, photo);
    commitStarted = true;
    await client.query('COMMIT');
    return created;
  } catch (error) {
    let safeToDelete = !insertStarted;
    if (client && !commitStarted) {
      try {
        await client.query('ROLLBACK');
        safeToDelete = true;
      } catch {
        discardConnection = true;
      }
    }
    if (commitStarted) discardConnection = true;

    // При потере ответа COMMIT запись могла сохраниться: фото тогда не удаляем.
    if (safeToDelete) {
      try {
        await storage.delete(photo.publicId);
      } catch {
        console.error('Не удалось убрать несохранённое фото; нужна сверка:', photo.publicId);
      }
    } else {
      console.error('Результат сохранения неизвестен; сверить фото с БД:', photo.publicId);
    }
    throw error;
  } finally {
    client?.release(discardConnection);
  }
}
