import type { IncomingMessage, ServerResponse } from 'node:http';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function isJsonContentType(contentType: string | undefined): boolean {
  return /^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType ?? '');
}

export async function readJson(request: IncomingMessage, limit = 4096): Promise<unknown> {
  if (!isJsonContentType(request.headers['content-type'])) {
    throw new HttpError(415, 'Ожидается application/json.');
  }
  if (Number(request.headers['content-length']) > limit) {
    throw new HttpError(413, 'Слишком большой запрос.');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string);
    size += buffer.length;
    if (size > limit) throw new HttpError(413, 'Слишком большой запрос.');
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new HttpError(400, 'Некорректный JSON.');
  }
}
