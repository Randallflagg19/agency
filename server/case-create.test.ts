import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { Pool } from 'pg';
import { createApiServer } from './app.js';
import type { AuthStore, AuthUser } from './auth-store.js';
import { parseCaseCreateBody } from './case-create.js';
import { HttpError } from './http.js';

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

test('POST требует администратора, CSRF и валидный JSON; GET остаётся публичным', async (t) => {
  const pool = new Pool();
  let session: AuthUser | null = { id: 'admin-id', login: 'tapir', role: 'admin' };
  const store: AuthStore = {
    findUser: async () => null,
    createSession: async () => true,
    findSession: async () => session,
    deleteSession: async () => {},
  };
  let writes = 0;
  let databaseUnavailable = false;
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
    coverImageUrl: null,
    tags: [],
    conclusion: null,
    relatedCaseIds: [],
  };
  t.mock.method(pool, 'query', async (sql: string, values?: unknown[]) => {
    if (!sql.includes('INSERT INTO')) return { rows: [created] };
    writes++;
    if (databaseUnavailable) throw new Error('Database unavailable');
    assert.ok(sql.includes("nextval('agency.case_number_seq')"));
    assert.equal(values?.[0], 'Голос из лифта');
    assert.equal(values?.length, 7);
    return { rows: [created] };
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
    'Content-Type': 'application/json',
    Origin: 'http://localhost:4200',
    'X-Agency-CSRF': '1',
    Cookie: `agency_session=${'a'.repeat(43)}`,
  };
  async function post(body: string, requestHeaders = headers) {
    const response = await fetch(url, { method: 'POST', headers: requestHeaders, body });
    const json: unknown = await response.json();
    return { response, json };
  }

  const success = await post(JSON.stringify(draft));
  assert.equal(success.response.status, 201);
  assert.equal(success.response.headers.get('location'), '/cases/case-0212');
  assert.deepEqual(success.json, created);
  assert.equal(writes, 1);

  assert.equal(
    (await post(JSON.stringify(draft), { ...headers, Cookie: '' })).response.status,
    401,
  );
  session = { id: 'reader', login: 'reader', role: 'reader' };
  assert.equal((await post(JSON.stringify(draft))).response.status, 403);
  session = { id: 'admin-id', login: 'tapir', role: 'admin' };
  assert.equal(
    (await post(JSON.stringify(draft), { ...headers, Origin: 'https://other.example' })).response
      .status,
    403,
  );
  assert.equal(
    (await post(JSON.stringify(draft), { ...headers, 'X-Agency-CSRF': '' })).response.status,
    403,
  );
  assert.equal((await post('{')).response.status, 400);
  assert.equal((await post(JSON.stringify({ ...draft, title: '  ' }))).response.status, 400);
  assert.equal(
    (await post(JSON.stringify(draft), { ...headers, 'Content-Type': 'text/plain' })).response
      .status,
    415,
  );
  assert.equal((await post(' '.repeat(128 * 1024 + 1))).response.status, 413);
  assert.equal(writes, 1, 'отклонённые запросы не должны выполнять INSERT');

  // Даже кириллическое описание в рамках формы не упирается в лимит входа 4 КБ.
  assert.equal(
    (await post(JSON.stringify({ ...draft, description: 'Я'.repeat(10000) }))).response.status,
    201,
  );
  const publicResponse = await fetch(url);
  assert.equal(publicResponse.status, 200);
  await publicResponse.json();
  const wrongMethod = await fetch(url, { method: 'DELETE' });
  assert.equal(wrongMethod.status, 405);
  assert.equal(wrongMethod.headers.get('allow'), 'GET, POST');
  await wrongMethod.json();

  databaseUnavailable = true;
  t.mock.method(console, 'error', () => {});
  const unavailable = await post(JSON.stringify(draft));
  assert.equal(unavailable.response.status, 503);
  assert.deepEqual(unavailable.json, { message: 'Сервис временно недоступен.' });
});
