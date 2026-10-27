import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, isValidLogin, normalizeLogin, verifyPassword } from './passwords.js';

test('Argon2id: случайная соль, верный и неверный пароль', async () => {
  const password = 'Учебный тестовый пароль 2026';
  const hash = await hashPassword(password);
  assert.match(hash, /^\$argon2id\$/);
  assert.notEqual(await hashPassword(password), hash);
  assert.equal(await verifyPassword(hash, password), true);
  assert.equal(await verifyPassword(hash, `${password}!`), false);
});

test('нормализация и валидация логина', () => {
  assert.equal(normalizeLogin(' Admin '), 'admin');
  assert.equal(isValidLogin('admin.name-1'), true);
  for (const value of ['ab', 'a'.repeat(65), "admin'); DELETE FROM agency.cases;--", 'админ']) {
    assert.equal(isValidLogin(value), false);
  }
});
