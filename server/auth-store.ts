import type { Pool } from 'pg';

export interface AuthUser {
  readonly id: string;
  readonly login: string;
  readonly role: string;
}

export interface LoginUser extends AuthUser {
  readonly passwordHash: string;
  readonly disabledAt: Date | null;
}

export interface AuthStore {
  findUser(login: string): Promise<LoginUser | null>;
  createSession(user: LoginUser, tokenHash: Buffer, seconds: number): Promise<boolean>;
  findSession(tokenHash: Buffer): Promise<AuthUser | null>;
  deleteSession(tokenHash: Buffer): Promise<void>;
}

export function createAuthStore(pool: Pick<Pool, 'query'>): AuthStore {
  return {
    async findUser(login) {
      const result = await pool.query<LoginUser>(
        `
        SELECT id, login, role, password_hash AS "passwordHash", disabled_at AS "disabledAt"
        FROM agency.users WHERE login = $1
      `,
        [login],
      );
      return result.rows[0] ?? null;
    },
    async createSession(user, tokenHash, seconds) {
      // Проверяем актуальность учётной записи ещё раз при INSERT.
      const result = await pool.query(
        `
        INSERT INTO agency.sessions (token_hash, user_id, expires_at)
        SELECT $1, id, CURRENT_TIMESTAMP + $3 * INTERVAL '1 second'
        FROM agency.users
        WHERE id = $2 AND disabled_at IS NULL AND password_hash = $4
      `,
        [tokenHash, user.id, seconds, user.passwordHash],
      );
      return result.rowCount === 1;
    },
    async findSession(tokenHash) {
      const result = await pool.query<AuthUser>(
        `
        SELECT u.id, u.login, u.role
        FROM agency.sessions s JOIN agency.users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
          AND u.disabled_at IS NULL
      `,
        [tokenHash],
      );
      return result.rows[0] ?? null;
    },
    async deleteSession(tokenHash) {
      await pool.query('DELETE FROM agency.sessions WHERE token_hash = $1', [tokenHash]);
    },
  };
}

export async function cleanupSessions(pool: Pick<Pool, 'query'>): Promise<number> {
  const result = await pool.query(
    'DELETE FROM agency.sessions WHERE expires_at <= CURRENT_TIMESTAMP',
  );
  return result.rowCount ?? 0;
}
