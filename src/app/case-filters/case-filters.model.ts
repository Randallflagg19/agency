import type { CaseCategory, CaseStatus, ThreatLevel } from '../cases/case.model';

export type CaseStatusFilter = CaseStatus | 'all';
export type CaseCategoryFilter = CaseCategory | 'all';
export type ThreatLevelFilter = ThreatLevel | 'all';
