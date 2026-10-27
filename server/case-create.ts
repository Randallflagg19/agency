import { CASE_CATEGORIES, THREAT_LEVELS, type IncidentCase } from '../src/app/cases/case.model.js';
import { HttpError } from './http.js';

export type NewCaseData = Pick<
  IncidentCase,
  'title' | 'description' | 'category' | 'threatLevel' | 'location'
>;

function readText(value: unknown, label: string, maxLength: number, required = false): string {
  if (typeof value !== 'string') {
    throw new HttpError(400, `${label}: ожидается строка.`);
  }
  if (value.length > maxLength) {
    throw new HttpError(400, `${label}: не больше ${maxLength} символов.`);
  }
  if (value.includes('\u0000')) {
    throw new HttpError(400, `${label}: недопустимый символ.`);
  }
  const text = value.trim();
  if (required && text.length === 0) {
    throw new HttpError(400, `${label}: заполните поле.`);
  }
  return text;
}

// JSON не становится надёжным только потому, что форма типизирована на клиенте.
export function parseCaseCreateBody(body: unknown): NewCaseData {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Ожидается объект с данными дела.');
  }
  const fields = [
    'title',
    'description',
    'category',
    'threatLevel',
    'region',
    'locationDescription',
    'address',
  ];
  if (Object.keys(body).some((key) => !fields.includes(key))) {
    throw new HttpError(400, 'Запрос содержит неизвестные поля.');
  }
  const data = body as Record<string, unknown>;
  const title = readText(data['title'], 'Название', 150, true);
  const description = readText(data['description'], 'Описание', 10000, true);
  const category = CASE_CATEGORIES.find((item) => item === data['category']);
  if (category === undefined) throw new HttpError(400, 'Недопустимая категория.');

  const threatLevel =
    data['threatLevel'] === null
      ? null
      : THREAT_LEVELS.find((item) => item === data['threatLevel']);
  if (threatLevel === undefined) throw new HttpError(400, 'Недопустимый уровень угрозы.');

  const region = readText(data['region'], 'Регион', 150);
  const locationDescription = readText(data['locationDescription'], 'Описание локации', 1000);
  const address = readText(data['address'], 'Адрес', 300);

  return {
    title,
    description,
    category,
    threatLevel,
    location:
      region || locationDescription || address
        ? { region: region || null, description: locationDescription, address: address || null }
        : null,
  };
}
