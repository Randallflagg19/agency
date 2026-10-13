import type {
  CaseCategory,
  CaseStatus,
  IncidentCase,
  ThreatLevel,
} from '../cases/case.model';

const STATUS_LABELS: Readonly<Record<CaseStatus, string>> = {
  new: 'Новое',
  investigating: 'В работе',
  suspended: 'Приостановлено',
  closed: 'Закрыто',
};

const CATEGORY_LABELS: Readonly<Record<CaseCategory, string>> = {
  unknown: 'Неизвестное явление',
  acoustic: 'Аудиальные явления',
  visual: 'Визуальные явления',
  telecommunication: 'Телекоммуникационные аномалии',
  disappearance: 'Исчезновения',
  spatial: 'Пространственные аномалии',
  physical: 'Физические аномалии',
};

const REGISTRATION_DATE_FORMATTER = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export interface CaseCardViewModel {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly coverImageUrl: string | null;
  readonly threatLevel: ThreatLevel | null;
  readonly statusLabel: string;
  readonly categoryLabel: string;
  readonly isActive: boolean;
  readonly locationLabel: string | null;
  readonly registeredAt: string;
  readonly registrationDate: string;
}

function formatRegistrationDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);

  if (!match) return '';

  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const parts = REGISTRATION_DATE_FORMATTER.formatToParts(date);
  const formattedDay = parts.find((part) => part.type === 'day')?.value;
  const formattedMonth = parts.find((part) => part.type === 'month')?.value;
  const formattedYear = parts.find((part) => part.type === 'year')?.value;

  if (!formattedDay || !formattedMonth || !formattedYear) return '';

  return `${formattedDay} ${formattedMonth} ${formattedYear}`;
}

export function createCaseCardViewModel(incident: IncidentCase): CaseCardViewModel {
  return {
    id: incident.id,
    number: incident.number,
    title: incident.title,
    coverImageUrl: incident.coverImageUrl,
    threatLevel: incident.threatLevel,
    statusLabel: STATUS_LABELS[incident.status],
    categoryLabel: CATEGORY_LABELS[incident.category],
    isActive: incident.status === 'investigating',
    locationLabel: incident.location?.region ?? null,
    registeredAt: incident.registeredAt,
    registrationDate: formatRegistrationDate(incident.registeredAt),
  };
}
