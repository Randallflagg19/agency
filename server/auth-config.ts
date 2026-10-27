export interface AuthConfig {
  readonly origin: string;
  readonly secure: boolean;
  readonly cookieName: string;
  readonly sessionSeconds: number;
}

export function readAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const mode = env['NODE_ENV'] ?? 'development';
  if (!['development', 'test', 'production'].includes(mode)) {
    throw new Error('NODE_ENV должен быть development, test или production.');
  }
  const secure = mode === 'production';
  const rawOrigin = env['APP_ORIGIN'] ?? (secure ? '' : 'http://localhost:4200');
  let url: URL;
  try {
    url = new URL(rawOrigin);
  } catch {
    throw new Error('Задайте APP_ORIGIN: точный origin сайта без пути.');
  }
  if (rawOrigin !== url.origin) {
    throw new Error('APP_ORIGIN должен содержать только протокол, хост и необязательный порт.');
  }
  if (secure && url.protocol !== 'https:') {
    throw new Error('Production требует HTTPS.');
  }
  if (!secure) {
    if (url.protocol !== 'http:') {
      throw new Error('Для локального запуска используйте HTTP.');
    }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error('Для локального запуска разрешён только loopback-адрес.');
    }
  }
  return {
    origin: url.origin,
    secure,
    cookieName: secure ? '__Host-agency_session' : 'agency_session',
    sessionSeconds: 8 * 60 * 60,
  };
}
