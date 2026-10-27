import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthConfig } from './auth-config.js';
import type { AuthStore, AuthUser } from './auth-store.js';
import { HttpError, readJson, sendJson } from './http.js';
import { LoginLimit } from './login-limit.js';
import { isValidLogin, normalizeLogin, verifyPassword } from './passwords.js';

// Синтетический хеш с теми же затратами: неизвестный логин тоже проверяет Argon2id.
const DUMMY_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$oKxYSvAOTkOgVoo6knTqDQ$Iwd0LFDDi4zcdgqrg1opQ5dJyvSC0Yzpc1L60d7bU8M';
const LOGIN_ERROR = 'Неверный логин или пароль.';

export function tokenHash(token: string): Buffer {
  return createHash('sha256').update(token).digest();
}

function parseLoginBody(body: unknown): { login: string; password: string } {
  if (
    typeof body !== 'object' ||
    body === null ||
    Array.isArray(body) ||
    !('login' in body) ||
    typeof body.login !== 'string' ||
    !('password' in body) ||
    typeof body.password !== 'string'
  ) {
    throw new HttpError(400, 'Проверьте формат логина и пароля.');
  }

  const login = normalizeLogin(body.login);
  const password = body.password;
  if (!isValidLogin(login) || password.length === 0 || Array.from(password).length > 128) {
    throw new HttpError(400, 'Проверьте формат логина и пароля.');
  }
  return { login, password };
}

export class Auth {
  private readonly limit = new LoginLimit();
  private activeLogins = 0;

  constructor(
    private readonly store: AuthStore,
    private readonly config: AuthConfig,
  ) {}

  assertTrustedMutation(request: IncomingMessage): void {
    // Origin задаёт браузер. Пользовательский заголовок требует CORS-preflight
    // при чужом origin; API не разрешает CORS. Значение "1" не является секретом.
    if (request.headers.origin !== this.config.origin || request.headers['x-agency-csrf'] !== '1') {
      throw new HttpError(403, 'Источник запроса не разрешён.');
    }
    const site = request.headers['sec-fetch-site'];
    if (site && site !== 'same-origin') throw new HttpError(403, 'Источник запроса не разрешён.');
  }

  private cookie(token: string, seconds: number): string {
    let cookie = `${this.config.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}`;
    if (this.config.secure) cookie += '; Secure';
    if (seconds === 0) cookie += '; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    return cookie;
  }

  private readToken(request: IncomingMessage): string | null {
    const values = (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter((part) => part.startsWith(`${this.config.cookieName}=`))
      .map((part) => part.slice(this.config.cookieName.length + 1));
    return values.length === 1 && /^[A-Za-z0-9_-]{43}$/.test(values[0]) ? values[0] : null;
  }

  async requireSession(request: IncomingMessage): Promise<AuthUser> {
    const token = this.readToken(request);
    const user = token ? await this.store.findSession(tokenHash(token)) : null;
    if (!user) throw new HttpError(401, 'Требуется вход.');
    return user;
  }

  async requireAdmin(request: IncomingMessage): Promise<AuthUser> {
    const user = await this.requireSession(request);
    if (user.role !== 'admin') throw new HttpError(403, 'Недостаточно прав.');
    return user;
  }

  async login(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const retry = this.limit.retryAfter();
    if (retry || this.activeLogins >= 2) {
      response.setHeader('Retry-After', String(retry || 1));
      throw new HttpError(429, 'Слишком много попыток входа. Повторите позже.');
    }
    this.activeLogins++;
    try {
      const { login, password } = parseLoginBody(await readJson(request));
      const user = await this.store.findUser(login);
      const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);
      if (!user || !valid || user.disabledAt !== null) throw new HttpError(401, LOGIN_ERROR);

      const token = randomBytes(32).toString('base64url');
      if (!(await this.store.createSession(user, tokenHash(token), this.config.sessionSeconds))) {
        throw new HttpError(401, LOGIN_ERROR);
      }
      const previous = this.readToken(request);
      if (previous) await this.store.deleteSession(tokenHash(previous));
      response.setHeader('Set-Cookie', this.cookie(token, this.config.sessionSeconds));
      sendJson(response, 200, { user: { id: user.id, login: user.login, role: user.role } });
    } finally {
      this.activeLogins--;
    }
  }

  async me(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      sendJson(response, 200, { user: await this.requireSession(request) });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        response.setHeader('Set-Cookie', this.cookie('', 0));
      }
      throw error;
    }
  }

  async logout(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const token = this.readToken(request);
    if (token) await this.store.deleteSession(tokenHash(token));
    // При ошибке БД не сообщаем об успешном отзыве сессии.
    response.setHeader('Set-Cookie', this.cookie('', 0));
    sendJson(response, 200, { ok: true });
  }
}
