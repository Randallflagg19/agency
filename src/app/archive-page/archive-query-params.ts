import { ParamMap } from '@angular/router';
import { CASE_STATUSES, CASE_CATEGORIES, THREAT_LEVELS } from '../cases/case.model';

export function isValidStatus(status: string | null) {
  return CASE_STATUSES.some((item) => item === status);
}

export function isValidCategory(category: string | null) {
  return CASE_CATEGORIES.some((item) => item === category);
}

export function isValidThreatLevel(threatLevel: string | null) {
  return THREAT_LEVELS.some((item) => item.toString() === threatLevel);
}

export function isValidRegion(region: string | null, regions: readonly string[]) {
  return regions.some((item) => item === region);
}

export function getInvalidQueryParams(params: ParamMap, regions: readonly string[]) {
  const status = params.get('status');
  const category = params.get('category');
  const threatLevel = params.get('threatLevel');
  const region = params.get('region');

  const filters: { status?: null; category?: null; threatLevel?: null; region?: null } = {};

  if (status !== null && !isValidStatus(status)) filters.status = null;
  if (category !== null && !isValidCategory(category)) filters.category = null;
  if (threatLevel !== null && threatLevel !== 'unrated' && !isValidThreatLevel(threatLevel))
    filters.threatLevel = null;
  if (region !== null && !isValidRegion(region, regions)) filters.region = null;

  return filters;
}
