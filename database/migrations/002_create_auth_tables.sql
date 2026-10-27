\set ON_ERROR_STOP on

BEGIN;

DO $$
BEGIN
  IF current_database() <> 'agency_db' THEN
    RAISE EXCEPTION 'Migration requires database agency_db';
  END IF;
END
$$;

SET LOCAL ROLE agency_owner;

-- Требует журнал из миграции 001. Повторное применение откатывается целиком.
INSERT INTO agency.schema_migrations (version)
VALUES ('002_create_auth_tables');

CREATE TABLE agency.users (
  id uuid PRIMARY KEY,
  -- Канонический логин: сервер приводит его к нижнему регистру.
  login text NOT NULL UNIQUE CHECK (login ~ '^[a-z0-9][a-z0-9_.-]{2,63}$'),
  password_hash text NOT NULL CHECK (password_hash LIKE '$argon2id$%'),
  -- В проекте только один администратор, публичной регистрации нет.
  role text NOT NULL DEFAULT 'admin' UNIQUE CHECK (role = 'admin'),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  disabled_at timestamptz
);

CREATE TABLE agency.sessions (
  -- SHA-256 от случайного токена. Сам токен хранится только в cookie.
  token_hash bytea PRIMARY KEY CHECK (octet_length(token_hash) = 32),
  user_id uuid NOT NULL REFERENCES agency.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX sessions_user_id_idx ON agency.sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON agency.sessions (expires_at);

REVOKE ALL PRIVILEGES ON agency.users, agency.sessions FROM PUBLIC, agency_app;
-- API читает хеш для проверки пароля, но не создаёт и не меняет пользователей.
GRANT SELECT ON agency.users TO agency_app;
-- Вход создаёт сессию; выход и очистка удаляют её. Продления пока нет.
GRANT SELECT, INSERT, DELETE ON agency.sessions TO agency_app;

COMMIT;
