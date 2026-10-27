import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { Pool, type PoolClient } from 'pg';
import sharp from 'sharp';
import { Readable } from 'node:stream';
import type { IncomingMessage } from 'node:http';
import { createApiServer } from './app.js';
import type { AuthStore, AuthUser } from './auth-store.js';
import { parseCaseCreateBody } from './case-create.js';
import { HttpError, readBody } from './http.js';

test('лимит тела соблюдается без Content-Length', async () => {
  const request = Object.assign(Readable.from([Buffer.alloc(8), Buffer.alloc(8)]), {
    headers: {},
  }) as unknown as IncomingMessage;
  await assert.rejects(
    readBody(request, 10),
    (error: unknown) => error instanceof HttpError && error.status === 413,
  );
});

const draft = {
  title: '  Голос из лифта  ',
  description: '  Первая строка\nВторая строка  ',
  category: 'acoustic',
  threatLevel: null,
  region: '',
  locationDescription: '',
  address: '',
};

test('подготовка текста и необязательного местоположения', () => {
  const data = parseCaseCreateBody(draft);
  assert.equal(data.title, 'Голос из лифта');
  assert.equal(data.description, 'Первая строка\nВторая строка');
  assert.equal(data.location, null);
  assert.equal(data.threatLevel, null);
  assert.deepEqual(parseCaseCreateBody({ ...draft, address: '  Дом 7  ' }).location, {
    region: null,
    description: '',
    address: 'Дом 7',
  });
  assert.equal(parseCaseCreateBody({ ...draft, threatLevel: 3 }).threatLevel, 3);
});

test('невалидные данные и подмена назначаемых сервером полей отклоняются', () => {
  const invalid = [
    null,
    [],
    'text',
    {},
    { ...draft, title: ' \n\t ' },
    { ...draft, description: '' },
    { ...draft, title: 'a'.repeat(151) },
    { ...draft, description: 'a'.repeat(10001) },
    { ...draft, region: 'a'.repeat(151) },
    { ...draft, locationDescription: 'a'.repeat(1001) },
    { ...draft, address: 'a'.repeat(301) },
    { ...draft, region: null },
    { ...draft, description: 'bad\u0000text' },
    { ...draft, category: 'all' },
    { ...draft, threatLevel: '3' },
    { ...draft, threatLevel: 6 },
    { ...draft, threatLevel: 1.5 },
    { ...draft, status: 'closed' },
    { ...draft, id: 'case-0001' },
  ];
  for (const body of invalid) {
    assert.throws(
      () => parseCaseCreateBody(body),
      (error: unknown) => error instanceof HttpError && error.status === 400,
    );
  }
});

test('POST проверяет доступ, multipart и изображение; сохраняет фото и откатывает сбои', async (t) => {
  const pool = new Pool();
  let session: AuthUser | null = { id: 'admin-id', login: 'tapir', role: 'admin' };
  const store: AuthStore = {
    findUser: async () => null,
    createSession: async () => true,
    findSession: async () => session,
    deleteSession: async () => {},
  };
  let writes = 0;
  let failure: 'connect' | 'insert' | 'commit' | 'rollback' | 'upload' | 'delete' | null = null;
  let uploads = 0;
  const deleted: string[] = [];
  const transactions: string[] = [];
  const photo = {
    url: 'https://res.cloudinary.com/test/image/upload/agency/test.png',
    publicId: 'agency/test',
    assetId: 'asset-test',
    width: 2,
    height: 2,
  };
  const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: 'red' } })
    .png()
    .toBuffer();
  const created = {
    id: 'case-0212',
    number: '0212',
    title: 'Голос из лифта',
    description: 'Описание',
    status: 'new',
    category: 'acoustic',
    threatLevel: null,
    location: null,
    assigneeId: null,
    registeredAt: '2026-10-27T12:00:00.000Z',
    coverImageUrl: photo.url,
    tags: [],
    conclusion: null,
    relatedCaseIds: [],
  };
  t.mock.method(pool, 'query', async () => ({ rows: [created] }));
  const client = {
    async query(sql: string, values?: unknown[]) {
      if (!sql.includes('INSERT INTO')) {
        transactions.push(sql);
        if (
          (failure === 'commit' && sql === 'COMMIT') ||
          (failure === 'rollback' && sql === 'ROLLBACK')
        ) {
          throw new Error('Connection lost');
        }
        return { rows: [] };
      }
      writes++;
      if (['insert', 'rollback', 'delete'].includes(failure ?? ''))
        throw new Error('Insert failed');
      assert.ok(sql.includes("nextval('agency.case_number_seq')"));
      assert.ok(sql.includes('cover_image_public_id'));
      assert.equal(values?.[0], 'Голос из лифта');
      assert.equal(values?.length, 10);
      assert.deepEqual(values?.slice(7), [photo.url, photo.publicId, photo.assetId]);
      return { rows: [created] };
    },
    release() {},
  } as unknown as PoolClient;
  t.mock.method(pool, 'connect', async () => {
    if (failure === 'connect') throw new Error('Database unavailable');
    return client;
  });
  const server = createApiServer(
    pool,
    {
      origin: 'http://localhost:4200',
      secure: false,
      cookieName: 'agency_session',
      sessionSeconds: 28800,
    },
    store,
    {
      async upload(file) {
        uploads++;
        if (failure === 'upload') throw new Error('Cloudinary unavailable');
        assert.ok(file.length > 0);
        return photo;
      },
      async delete(publicId) {
        if (failure === 'delete') throw new Error('Cloudinary unavailable');
        deleted.push(publicId);
      },
    },
  );
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await pool.end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}/api/cases`;
  const headers: Record<string, string> = {
    Origin: 'http://localhost:4200',
    'X-Agency-CSRF': '1',
    Cookie: `agency_session=${'a'.repeat(43)}`,
  };
  function multipart(data: unknown = draft, bytes: Uint8Array = image, type = 'image/png') {
    const body = new FormData();
    body.append('draft', JSON.stringify(data));
    body.append('photo', new Blob([new Uint8Array(bytes)], { type }), 'photo.png');
    return body;
  }
  async function post(body: FormData | string = multipart(), requestHeaders = headers) {
    const response = await fetch(url, { method: 'POST', headers: requestHeaders, body });
    const json: unknown = await response.json();
    return { response, json };
  }

  const success = await post();
  assert.equal(success.response.status, 201);
  assert.equal(success.response.headers.get('location'), '/cases/case-0212');
  assert.deepEqual(success.json, created);
  assert.equal(writes, 1);
  assert.deepEqual(transactions, ['BEGIN', 'COMMIT']);
  assert.equal(deleted.length, 0);

  assert.equal((await post(multipart(), { ...headers, Cookie: '' })).response.status, 401);
  session = { id: 'reader', login: 'reader', role: 'reader' };
  assert.equal((await post()).response.status, 403);
  session = { id: 'admin-id', login: 'tapir', role: 'admin' };
  assert.equal(
    (await post(multipart(), { ...headers, Origin: 'https://other.example' })).response.status,
    403,
  );
  assert.equal((await post(multipart(), { ...headers, 'X-Agency-CSRF': '' })).response.status, 403);
  const invalidJSON = multipart();
  invalidJSON.set('draft', '{');
  assert.equal((await post(invalidJSON)).response.status, 400);
  assert.equal((await post(multipart({ ...draft, title: '  ' }))).response.status, 400);
  assert.equal(
    (await post(JSON.stringify(draft), { ...headers, 'Content-Type': 'application/json' })).response
      .status,
    415,
  );
  assert.equal(
    (await post(multipart(draft, Buffer.alloc(5 * 1024 * 1024 + 1)))).response.status,
    413,
  );
  const largeDraft = multipart();
  largeDraft.set('draft', ' '.repeat(128 * 1024 + 1));
  assert.equal((await post(largeDraft)).response.status, 413);
  assert.equal((await post(multipart(draft, Buffer.alloc(6 * 1024 * 1024)))).response.status, 413);
  assert.equal(
    (await post('broken', { ...headers, 'Content-Type': 'multipart/form-data; boundary=x' }))
      .response.status,
    400,
  );
  for (const invalid of [
    Buffer.alloc(0),
    Buffer.from('not an image'),
    image.subarray(0, 35),
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"></svg>'),
  ]) {
    assert.equal((await post(multipart(draft, invalid))).response.status, 400);
  }
  for (const change of ['missing', 'duplicate', 'extra', 'text'] as const) {
    const body = multipart();
    if (change === 'missing') body.delete('photo');
    if (change === 'duplicate') body.append('draft', JSON.stringify(draft));
    if (change === 'extra') body.append('publicId', 'tapir/other-project');
    if (change === 'text') body.set('photo', 'https://example.com/photo.jpg');
    assert.equal((await post(body)).response.status, 400);
  }
  assert.equal(writes, 1, 'отклонённые запросы не должны выполнять INSERT');
  assert.equal(uploads, 1, 'отклонённые запросы не должны загружать фото');

  // Даже кириллическое описание в рамках формы не упирается в лимит входа 4 КБ.
  assert.equal(
    (await post(multipart({ ...draft, description: 'Я'.repeat(10000) }))).response.status,
    201,
  );
  for (const format of ['jpeg', 'webp'] as const) {
    const bytes = await sharp(image).toFormat(format).toBuffer();
    assert.equal((await post(multipart(draft, bytes, `image/${format}`))).response.status, 201);
  }
  const publicResponse = await fetch(url);
  assert.equal(publicResponse.status, 200);
  await publicResponse.json();
  const wrongMethod = await fetch(url, { method: 'DELETE' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'GET, POST');
  await wrongMethod.json();

  t.mock.method(console, 'error', () => {});
  for (const stage of ['connect', 'insert'] as const) {
    failure = stage;
    assert.equal((await post()).response.status, 503);
  }
  assert.deepEqual(deleted, [photo.publicId, photo.publicId]);
  assert.equal(transactions.at(-1), 'ROLLBACK');
  for (const stage of ['commit', 'rollback', 'delete', 'upload'] as const) {
    failure = stage;
    const before: number = writes;
    assert.equal((await post()).response.status, 503);
    if (stage === 'upload') assert.equal(writes, before, 'ошибка загрузки не создаёт дело');
  }
  assert.equal(deleted.length, 2, 'не удаляем фото при неизвестном результате транзакции');
});
