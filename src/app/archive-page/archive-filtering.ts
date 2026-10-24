import {
  CaseCategoryFilter,
  CaseStatusFilter,
  ThreatLevelFilter,
} from '../case-filters/case-filters.model';
import { IncidentCase } from '../cases/case.model';

export function filterCases(
  status: CaseStatusFilter,
  category: CaseCategoryFilter,
  threatLevel: ThreatLevelFilter,
  region: string,
  query: string,
  cases: readonly IncidentCase[],
) {
  return cases.filter((item) => {
    const matchesStatus = status === 'all' || item.status === status;
    const matchesCategory = category === 'all' || item.category === category;
    const matchesThreatLevel = threatLevel === 'all' || item.threatLevel === threatLevel;
    const matchesRegion = region === 'all' || item.location?.region === region;
    const matchesQuery = query === '' || item.title.toLowerCase().includes(query);

    return matchesStatus && matchesCategory && matchesThreatLevel && matchesQuery && matchesRegion;
  });
}
