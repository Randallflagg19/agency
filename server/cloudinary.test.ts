import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { test } from 'node:test';
import { v2 as cloudinary } from 'cloudinary';
import { deleteCasePhoto, getCloudinaryFolderMode, uploadCasePhoto } from './cloudinary.js';

test('Cloudinary: папка agency, результат загрузки и ограничение удаления', async (t) => {
  const keys = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
  const saved = keys.map((key) => process.env[key]);
  keys.forEach((key) => {
    process.env[key] = 'test-only';
  });
  t.after(() =>
    keys.forEach((key, index) => {
      if (saved[index] === undefined) delete process.env[key];
      else process.env[key] = saved[index];
    }),
  );

  // Ни один из тестов не обращается к аккаунту Cloudinary.
  t.mock.method(cloudinary, 'config', () => ({}));
  t.mock.method(cloudinary.api, 'config', async () => ({ settings: { folder_mode: 'dynamic' } }));
  assert.equal(await getCloudinaryFolderMode(), 'dynamic');

  const bytes = Buffer.from('test image bytes');
  let options: Record<string, unknown> = {};
  t.mock.method(
    cloudinary.uploader,
    'upload_stream',
    (
      receivedOptions: Record<string, unknown>,
      callback: (error: unknown, result: Record<string, unknown>) => void,
    ) => {
      options = receivedOptions;
      const stream = new Writable({
        write(chunk, _encoding, done) {
          assert.deepEqual(chunk, bytes);
          done();
        },
      });
      stream.on('finish', () =>
        callback(undefined, {
          secure_url: 'https://res.cloudinary.com/test/image.jpg',
          public_id: receivedOptions.folder
            ? `${receivedOptions.folder}/${receivedOptions.public_id}`
            : receivedOptions.public_id,
          asset_id: 'asset-id',
          width: 640,
          height: 480,
        }),
      );
      return stream;
    },
  );

  const dynamic = await uploadCasePhoto(bytes, 'dynamic');
  assert.equal(options.asset_folder, 'agency');
  assert.equal(options.folder, undefined);
  assert.equal(options.resource_type, 'image');
  assert.equal(options.overwrite, false);
  assert.deepEqual(options.allowed_formats, ['jpg', 'png', 'webp']);
  assert.match(dynamic.publicId, /^agency\//);
  assert.equal(dynamic.assetId, 'asset-id');
  assert.equal(dynamic.width, 640);
  assert.equal(dynamic.url, 'https://res.cloudinary.com/test/image.jpg');

  const fixed = await uploadCasePhoto(bytes, 'fixed');
  assert.equal(options.folder, 'agency');
  assert.equal(options.asset_folder, undefined);
  assert.match(fixed.publicId, /^agency\//);
  assert.notEqual(fixed.publicId, dynamic.publicId);
  await assert.rejects(uploadCasePhoto(Buffer.alloc(0), 'dynamic'));
  await assert.rejects(uploadCasePhoto(Buffer.alloc(5 * 1024 * 1024 + 1), 'dynamic'));

  const destroy = t.mock.method(cloudinary.uploader, 'destroy', async () => ({ result: 'ok' }));
  await assert.rejects(deleteCasePhoto('tapir/other-project'));
  assert.equal(destroy.mock.callCount(), 0);
  await deleteCasePhoto(dynamic.publicId);
  assert.equal(destroy.mock.callCount(), 1);
  assert.equal(destroy.mock.calls[0]?.arguments[0], dynamic.publicId);
});
