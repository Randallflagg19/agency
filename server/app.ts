import { createServer } from 'node:http';
import type { Pool } from 'pg';
import { Auth } from './auth.js';
import { readAuthConfig, type AuthConfig } from './auth-config.js';
import { createAuthStore, type AuthStore } from './auth-store.js';
import { createCase, getCases } from './cases.js';
import { parseCaseCreateBody } from './case-create.js';
import { HttpError, readJson, sendJson } from './http.js';

export function createApiServer(
  pool: Pool,
  config: AuthConfig = readAuthConfig(),
  store: AuthStore = createAuthStore(pool),
) {
  const auth = new Auth(store, config);
  return createServer(
    { maxHeaderSize: 16384, requestTimeout: 15000, headersTimeout: 10000 },
    async (request, response) => {
      try {
        const pathname = request.url?.split('?')[0];
        const methods: Record<string, readonly string[]> = {
          '/api/cases': ['GET', 'POST'],
          '/api/auth/login': ['POST'],
          '/api/auth/me': ['GET'],
          '/api/auth/logout': ['POST'],
        };
        const method = pathname ? methods[pathname] : undefined;
        if (!method) throw new HttpError(404, 'Маршрут не найден.');
        if (!request.method || !method.includes(request.method)) {
          response.setHeader('Allow', method.join(', '));
          throw new HttpError(405, 'Метод не поддерживается.');
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
          auth.assertTrustedMutation(request);
        switch (pathname) {
          case '/api/cases':
            if (request.method === 'GET') {
              sendJson(response, 200, await getCases(pool));
            } else {
              await auth.requireAdmin(request);
              // Отдельный лимит: текст дела может быть длиннее данных входа.
              const data = parseCaseCreateBody(await readJson(request, 128 * 1024));
              const created = await createCase(pool, data);
              response.setHeader('Location', `/cases/${created.id}`);
              sendJson(response, 201, created);
            }
            break;
          case '/api/auth/login':
            await auth.login(request, response);
            break;
          case '/api/auth/me':
            await auth.me(request, response);
            break;
          case '/api/auth/logout':
            await auth.logout(request, response);
            break;
        }
      } catch (error) {
        if (response.destroyed) return;
        if (error instanceof HttpError) {
          sendJson(response, error.status, { message: error.message });
        } else {
          console.error('Ошибка обработки запроса API.');
          sendJson(response, 503, { message: 'Сервис временно недоступен.' });
        }
      } finally {
        if (!request.destroyed && !request.readableEnded) request.resume();
      }
    },
  );
}
