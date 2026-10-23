import { Component, computed, type Signal, signal, inject, effect } from '@angular/core';
import type { CaseCategory, IncidentCase, ThreatLevel } from '../cases/case.model';
import { MOCK_CASES } from '../cases/cases.mock';
import { CaseFilters } from '../case-filters/case-filters';
import { CaseDetails } from '../case-details/case-details';
import { CaseCard } from '../case-card/case-card';
import { toSignal } from '@angular/core/rxjs-interop';
import type {
  CaseCategoryFilter,
  CaseStatusFilter,
  ThreatLevelFilter,
} from '../case-filters/case-filters.model';
import { ActivatedRoute, Router } from '@angular/router';
import type { CaseStatus } from '../cases/case.model';
import { CASE_STATUSES, CASE_CATEGORIES, THREAT_LEVELS } from '../cases/case.model';

@Component({
  imports: [CaseCard, CaseDetails, CaseFilters],
  selector: 'app-archive-page',
  styleUrl: './archive-page.css',
  templateUrl: './archive-page.html',
})
export class ArchivePage {
  constructor() {
    effect(() => {
      const status = this.queryParams().get('status');
      const category = this.queryParams().get('category');
      const threatLevel = this.queryParams().get('threatLevel');
      const region = this.queryParams().get('region');

      const filters: { status?: null; category?: null; threatLevel?: null; region?: null } = {};

      if (status !== null && !CASE_STATUSES.some((item) => item === status)) filters.status = null;
      if (category !== null && !CASE_CATEGORIES.some((item) => item === category))
        filters.category = null;
      if (
        threatLevel !== null &&
        threatLevel !== 'unrated' &&
        !THREAT_LEVELS.some((item) => item.toString() === threatLevel)
      )
        filters.threatLevel = null;
      if (region !== null && !this.regions.some((item) => item === region)) filters.region = null;

      if (Object.keys(filters).length) {
        this.router.navigate([], {
          queryParams: {
            ...filters,
          },
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
    if (CASE_STATUSES.some((item) => item === status)) return status as CaseStatus;
    else return 'all';
  });

  protected readonly categoryFilter = computed(() => {
    const category = this.queryParams().get('category');
    if (!category) return 'all';
    if (CASE_CATEGORIES.some((item) => item === category)) return category as CaseCategory;
    else return 'all';
  });

  protected readonly threatLevelFilter = computed(() => {
    const threatLevel = this.queryParams().get('threatLevel');
    if (!threatLevel) return 'all';
    if (threatLevel === 'unrated') return null;
    if (THREAT_LEVELS.some((item) => item.toString() === threatLevel))
      return Number(threatLevel) as ThreatLevel;
    else return 'all';
  });

  protected readonly regionFilter = computed(() => {
    const region = this.queryParams().get('region');
    if (!region) return 'all';
    if (this.regions.some((item) => item === region)) return region;
    else return 'all';
  });

  protected readonly filteredCases = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const threatLevel = this.threatLevelFilter();
    const region = this.regionFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.cases.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const matchesCategory = category === 'all' || item.category === category;
      const matchesThreatLevel = threatLevel === 'all' || item.threatLevel === threatLevel;
      const matchesRegion = region === 'all' || item.location?.region === region;
      const matchesQuery = query === '' || item.title.toLowerCase().includes(query);

      return (
        matchesStatus && matchesCategory && matchesThreatLevel && matchesQuery && matchesRegion
      );
    });
  });

  protected readonly selectedCase: Signal<IncidentCase | null> = computed(() => {
    const caseId = this.routeCaseId();
    return this.filteredCases().find((item) => item.id === caseId) ?? null;
  });

  handleCaseSelected(caseId: string) {
    this.router.navigate(['/cases', caseId], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
    });
  }

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  updateStatusFilter(status: CaseStatusFilter): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: status === 'all' ? null : status,
      },
      queryParamsHandling: 'merge',
    });
  }

  updateCategoryFilter(category: CaseCategoryFilter): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        category: category === 'all' ? null : category,
      },
      queryParamsHandling: 'merge',
    });
  }

  updateThreatLevelFilter(threatLevel: ThreatLevelFilter): void {
    let levelParam;
    if (threatLevel === 'all') levelParam = null;
    else if (threatLevel === null) levelParam = 'unrated';
    else levelParam = threatLevel;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        threatLevel: levelParam,
      },
      queryParamsHandling: 'merge',
    });
  }

  updateRegionFilter(region: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        region: region === 'all' ? null : region,
      },
      queryParamsHandling: 'merge',
    });
  }

  resetFilters() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        status: null,
        category: null,
        threatLevel: null,
        region: null,
      },
      queryParamsHandling: 'merge',
    });
  }
}
