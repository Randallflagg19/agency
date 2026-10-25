import { createServer, type ServerResponse } from 'node:http';
import type { Pool } from 'pg';
import { getCases } from './cases.js';

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

export function createApiServer(pool: Pool) {
  return createServer(async (request, response) => {
    const pathname = request.url?.split('?')[0];
    if (pathname !== '/api/cases') {
      sendJson(response, 404, { message: 'Маршрут не найден.' });
      return;
    }
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      sendJson(response, 405, { message: 'Метод не поддерживается.' });
      return;
    }

    try {
      const cases = await getCases(pool);
      sendJson(response, 200, cases);
    } catch {
      console.error('Не удалось загрузить дела из PostgreSQL.');
      sendJson(response, 503, { message: 'Архив временно недоступен.' });
    }
  });
}
