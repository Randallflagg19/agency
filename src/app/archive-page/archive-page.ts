import { Component, computed, type Signal, signal, inject, effect } from '@angular/core';
import type {
  ArchiveQueryChanges,
  CaseCategory,
  IncidentCase,
  ThreatLevel,
} from '../cases/case.model';
import { MOCK_CASES } from '../cases/cases.mock';
import { CaseFilters } from '../case-filters/case-filters';
import { CaseDetails } from '../case-details/case-details';
import { CaseCard } from '../case-card/case-card';
import { CaseNotFound } from '../case-not-found/case-not-found';
import { CasesEmpty } from '../cases-empty/cases-empty';
import { toSignal } from '@angular/core/rxjs-interop';
import type {
  CaseCategoryFilter,
  CaseStatusFilter,
  ThreatLevelFilter,
} from '../case-filters/case-filters.model';
import { ActivatedRoute, Router } from '@angular/router';
import type { CaseStatus } from '../cases/case.model';
import {
  isValidCategory,
  isValidStatus,
  isValidThreatLevel,
  isValidRegion,
  getInvalidQueryParams,
} from './archive-query-params';
import { filterCases } from './archive-filtering';

@Component({
  imports: [CaseCard, CaseDetails, CaseFilters, CaseNotFound, CasesEmpty],
  selector: 'app-archive-page',
  styleUrl: './archive-page.css',
  templateUrl: './archive-page.html',
})
export class ArchivePage {
  constructor() {
    effect(() => {
      const invalidQueryParams = getInvalidQueryParams(this.queryParams(), this.regions);

      if (Object.keys(invalidQueryParams).length) {
        this.router.navigate([], {
          queryParams: {
            ...invalidQueryParams,
          },
          queryParamsHandling: 'merge',
        });
      }
    });
    effect(() => {
      const currentCaseId = this.routeParams().get('caseId');
      if (
        currentCaseId &&
        this.cases.some((item) => item.id === currentCaseId) &&
        !this.filteredCases().some((item) => item.id === currentCaseId)
      ) {
        this.router.navigate(['/'], {
          queryParamsHandling: 'merge',
        });
      }
    });
  }

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly cases = MOCK_CASES;

  protected readonly regions = [
    ...new Set(
      this.cases
        .map((incident) => incident.location?.region)
        .filter((region) => region !== null && region !== undefined),
    ),
  ];

  protected readonly routeCaseId = computed(() => this.routeParams().get('caseId'));

  protected readonly searchQuery = signal('');

  protected readonly statusFilter = computed(() => {
    const status = this.queryParams().get('status');
    if (!status) return 'all';
    if (isValidStatus(status)) return status as CaseStatus;
    else return 'all';
  });

  protected readonly categoryFilter = computed(() => {
    const category = this.queryParams().get('category');
    if (!category) return 'all';
    if (isValidCategory(category)) return category as CaseCategory;
    else return 'all';
  });

  protected readonly threatLevelFilter = computed(() => {
    const threatLevel = this.queryParams().get('threatLevel');
    if (!threatLevel) return 'all';
    if (threatLevel === 'unrated') return null;
    if (isValidThreatLevel(threatLevel)) return Number(threatLevel) as ThreatLevel;
    else return 'all';
  });

  protected readonly regionFilter = computed(() => {
    const region = this.queryParams().get('region');
    if (!region) return 'all';
    if (isValidRegion(region, this.regions)) return region;
    else return 'all';
  });

  protected readonly filteredCases = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const threatLevel = this.threatLevelFilter();
    const region = this.regionFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return filterCases(status, category, threatLevel, region, query, this.cases);
  });

  protected readonly selectedCase: Signal<IncidentCase | null> = computed(() => {
    const caseId = this.routeCaseId();
    return this.filteredCases().find((item) => item.id === caseId) ?? null;
  });

  protected readonly isCaseNotFound = computed(() => {
    const currentId = this.routeCaseId();
    return currentId !== null && !this.cases.some((item) => item.id === currentId);
  });

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  updateQueryParams(change: ArchiveQueryChanges) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: change,
      queryParamsHandling: 'merge',
    });
  }

  handleCaseSelected(caseId: string) {
    this.router.navigate(['/cases', caseId], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  updateStatusFilter(status: CaseStatusFilter): void {
    this.updateQueryParams({ status: status === 'all' ? null : status });
  }

  updateCategoryFilter(category: CaseCategoryFilter): void {
    this.updateQueryParams({ category: category === 'all' ? null : category });
  }

  updateThreatLevelFilter(threatLevel: ThreatLevelFilter): void {
    let levelParam: ThreatLevel | 'unrated' | null;
    if (threatLevel === 'all') levelParam = null;
    else if (threatLevel === null) levelParam = 'unrated';
    else levelParam = threatLevel;
    this.updateQueryParams({ threatLevel: levelParam });
  }

  updateRegionFilter(region: string): void {
    this.updateQueryParams({ region: region === 'all' ? null : region });
  }

  resetFilters() {
    this.updateQueryParams({ status: null, category: null, threatLevel: null, region: null });
  }

  resetSearchAndFilters(): void {
    this.searchQuery.set('');
    this.resetFilters();
  }
}
