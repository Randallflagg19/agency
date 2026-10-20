import type { IncidentCase, ThreatLevel } from '../cases/case.model';
import { createCaseMetadata, type CaseMetadata } from '../cases/case-metadata.presenter';

export interface CaseCardViewModel extends CaseMetadata {
  readonly id: string;
  readonly number: string;
  readonly title: string;
  readonly coverImageUrl: string | null;
  readonly threatLevel: ThreatLevel | null;
  readonly locationLabel: string | null;
  readonly registeredAt: string;
}

export function createCaseCardViewModel(incident: IncidentCase): CaseCardViewModel {
  return {
    ...createCaseMetadata(incident),
    id: incident.id,
    number: incident.number,
    title: incident.title,
    coverImageUrl: incident.coverImageUrl,
    threatLevel: incident.threatLevel,
    locationLabel: incident.location?.region ?? null,
    registeredAt: incident.registeredAt,
  };
}
