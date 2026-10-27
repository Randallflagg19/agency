import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';

export type CloudinaryFolderMode = 'dynamic' | 'fixed';

export type UploadedCasePhoto = {
  url: string;
  publicId: string;
  assetId: string;
  width: number;
  height: number;
};

const CASE_PHOTO_FOLDER = 'agency';
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Вызываем только при работе с фотографиями: архив может работать без Cloudinary.
function configureCloudinary(): void {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Заполните серверные переменные CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY и CLOUDINARY_API_SECRET.',
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
    timeout: 15000,
  });
}

// Только чтение настроек окружения; файлы и папки не изменяются.
// Позже вызывающий код сохранит режим, чтобы не проверять его для каждого файла.
export async function getCloudinaryFolderMode(): Promise<CloudinaryFolderMode> {
  configureCloudinary();
  try {
    const result = await cloudinary.api.config({ settings: true, timeout: 15000 });
    const mode = result.settings?.folder_mode;
    if (mode === 'dynamic' || mode === 'fixed') return mode;
  } catch {
    throw new Error(
      'Не удалось прочитать настройки Cloudinary. Проверьте подключение и права API-ключа.',
    );
  }
  throw new Error('Cloudinary не вернул поддерживаемый режим папок.');
}

// Buffer — байты файла, который примет наш API. Путь или URL от клиента не нужен.
export async function uploadCasePhoto(
  file: Buffer,
  folderMode: CloudinaryFolderMode,
): Promise<UploadedCasePhoto> {
  if (file.length === 0 || file.length > MAX_PHOTO_BYTES) {
    throw new Error('Фотография должна быть непустой и не превышать 5 МиБ.');
  }
  if (folderMode !== 'dynamic' && folderMode !== 'fixed') {
    throw new Error('Неизвестный режим папок Cloudinary.');
  }
  configureCloudinary();
  const id = randomUUID();
  const placement =
    folderMode === 'dynamic'
      ? { asset_folder: CASE_PHOTO_FOLDER, public_id: `${CASE_PHOTO_FOLDER}/${id}` }
      : { folder: CASE_PHOTO_FOLDER, public_id: id };
  const publicId = `${CASE_PHOTO_FOLDER}/${id}`;

  return new Promise((resolve, reject) => {
    const fail = () => {
      // При тайм-ауте Cloudinary мог принять файл, но не вернуть ответ.
      console.error('Загрузка фото не подтверждена; при необходимости сверить ресурс:', publicId);
      reject(new Error('Не удалось загрузить фотографию в Cloudinary.'));
    };
    const stream = cloudinary.uploader.upload_stream(
      {
        ...placement,
        resource_type: 'image',
        allowed_formats: ['jpg', 'png', 'webp'],
        overwrite: false,
        timeout: 60000,
      },
      (error, result) => {
        if (error || !result) {
          fail();
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          assetId: result.asset_id,
          width: result.width,
          height: result.height,
        });
      },
    );
    stream.on('error', fail);
    stream.end(file);
  });
}

// Передавать только publicId, полученный сервером при загрузке или прочитанный из БД.
// Ограничиваем удаление пространством имён и форматом ID этого приложения.
export async function deleteCasePhoto(publicId: string): Promise<void> {
  if (
    !/^agency\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(publicId)
  ) {
    throw new Error('Недопустимый идентификатор фотографии дела.');
  }
  configureCloudinary();
  try {
    const response: unknown = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    if (
      typeof response === 'object' &&
      response !== null &&
      'result' in response &&
      (response.result === 'ok' || response.result === 'not found')
    )
      return;
  } catch {
    throw new Error('Не удалось удалить фотографию из Cloudinary.');
  }
  throw new Error('Cloudinary не подтвердил удаление фотографии.');
}
