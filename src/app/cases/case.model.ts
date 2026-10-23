export const CASE_STATUSES = ['new', 'investigating', 'suspended', 'closed'] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_CATEGORIES = [
  'unknown',
  'acoustic',
  'visual',
  'telecommunication',
  'disappearance',
  'spatial',
  'physical',
] as const;

export type CaseCategory = (typeof CASE_CATEGORIES)[number];

export type ThreatLevel = 1 | 2 | 3 | 4 | 5;

export interface CaseLocation {
  /** Регион для фильтрации; null, если пока неизвестен. */
  readonly region: string | null;
  /** Свободное описание места, в том числе без почтового адреса. */
  readonly description: string;
  readonly address: string | null;
}

export interface IncidentCase {
  /** Стабильный внутренний идентификатор. */
  readonly id: string;
  /** Отображаемый уникальный номер, например '0147'. Уникальность проверяет сервер. */
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly status: CaseStatus;
  readonly category: CaseCategory;
  /** null — угроза ещё не оценена. */
  readonly threatLevel: ThreatLevel | null;
  readonly location: CaseLocation | null;
  /** Идентификатор сотрудника; null — ответственный не назначен. */
  readonly assigneeId: string | null;
  /** Дата и время регистрации в формате ISO 8601 с часовым поясом. */
  readonly registeredAt: string;
  /** Основное изображение дела для списка и карточки; null, если изображения нет. */
  readonly coverImageUrl: string | null;
  readonly tags: readonly string[];
  readonly conclusion: string | null;
  readonly relatedCaseIds: readonly string[];
}
