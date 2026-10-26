import type { CaseCategory, ThreatLevel } from '../cases/case.model';

export type CaseCreateDraft = {
  title: string;
  description: string;
  category: CaseCategory;
  threatLevel: ThreatLevel | null;
  region: string;
  locationDescription: string;
  address: string;
};
