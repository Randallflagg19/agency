import { argon2id, hash, verify } from 'argon2';

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function isValidLogin(login: string): boolean {
  return /^[a-z0-9][a-z0-9_.-]{2,63}$/.test(login);
}

export function hashPassword(password: string): Promise<string> {
  // Соль генерирует библиотека; параметры и соль входят в строку хеша.
  return hash(password, { type: argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
}

export function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  return verify(passwordHash, password);
}
