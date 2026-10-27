import { createServer } from 'node:http';
import type { Pool } from 'pg';
import { Auth } from './auth.js';
import { readAuthConfig, type AuthConfig } from './auth-config.js';
import { createAuthStore, type AuthStore } from './auth-store.js';
import { getCases } from './cases.js';
import { HttpError, sendJson } from './http.js';

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
        const methods: Record<string, string> = {
          '/api/cases': 'GET',
          '/api/auth/login': 'POST',
          '/api/auth/me': 'GET',
          '/api/auth/logout': 'POST',
        };
        const method = pathname ? methods[pathname] : undefined;
        if (!method) throw new HttpError(404, 'Маршрут не найден.');
        if (request.method !== method) {
          response.setHeader('Allow', method);
          throw new HttpError(405, 'Метод не поддерживается.');
        }
        if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method))
          auth.assertTrustedMutation(request);
        switch (pathname) {
          case '/api/cases':
            sendJson(response, 200, await getCases(pool));
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
