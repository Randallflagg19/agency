import pg from 'pg';
import { createApiServer } from './app.js';
import { readAuthConfig } from './auth-config.js';
import { cleanupSessions } from './auth-store.js';
import { createCasePhotoStorage } from './case-upload.js';
import { startCasePhotoCleanup } from './case-photo-cleanup.js';

const port = Number(process.env['API_PORT'] ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('API_PORT должен быть целым числом от 1 до 65535.');
}
for (const name of ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD']) {
  if (!process.env[name]) throw new Error(`Не задана серверная настройка ${name}.`);
}

const authConfig = readAuthConfig();
const pool = new pg.Pool({
  max: 5,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
  application_name: 'agency-api',
});
pool.on('error', () => console.error('Ошибка фонового соединения с PostgreSQL.'));

const photos = createCasePhotoStorage();
const server = createApiServer(pool, authConfig, undefined, photos);
let stopPhotoCleanup: (() => Promise<void>) | undefined;
const cleanup = () => {
  void cleanupSessions(pool).catch(() => console.error('Не удалось очистить истёкшие сессии.'));
};
const cleanupTimer = setInterval(cleanup, 60 * 60 * 1000);
cleanupTimer.unref();
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Порт ${port} уже занят. Остановите ранее запущенный API через Ctrl+C и повторите pnpm dev.`,
    );
  } else {
    console.error(`Не удалось запустить HTTP-сервер API (${error.code ?? 'UNKNOWN'}).`);
  }
  void pool.end().finally(() => process.exit(1));
});
server.listen(port, '127.0.0.1', () => {
  console.log(`API: http://127.0.0.1:${port}/api/cases`);
  cleanup();
  stopPhotoCleanup = startCasePhotoCleanup(pool, photos);
});

let stopping = false;
function shutdown(): void {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanupTimer);
  const timeout = setTimeout(() => process.exit(1), 15000);
  timeout.unref();
  server.close(() => {
    void Promise.resolve(stopPhotoCleanup?.())
      .then(() => pool.end())
      .then(
        () => process.exit(0),
        () => process.exit(1),
      );
  });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
