import { Component, computed, type Signal, signal, inject } from '@angular/core';
import type { IncidentCase } from '../cases/case.model';
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

@Component({
  imports: [CaseCard, CaseDetails, CaseFilters],
  selector: 'app-archive-page',
  styleUrl: './archive-page.css',
  templateUrl: './archive-page.html',
})
export class ArchivePage {
  protected readonly cases = MOCK_CASES;

  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  private readonly routeParams = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly routeCaseId = computed(() => this.routeParams().get('caseId'));

  protected readonly status = computed(() => this.queryParams().get('status')) ?? 'all';

  protected readonly regions = [
    ...new Set(
      this.cases
        .map((incident) => incident.location?.region)
        .filter((region) => region !== null && region !== undefined),
    ),
  ];

  handleCaseSelected(caseId: string) {
    this.router.navigate(['/cases', caseId]);
  }

  protected readonly selectedCase: Signal<IncidentCase | null> = computed(() => {
    const caseId = this.routeCaseId();
    return this.cases.find((item) => item.id === caseId) ?? null;
  });

  protected readonly searchQuery = signal('');

  updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected readonly statusFilter = signal<CaseStatusFilter>('all');

  updateStatusFilter(status: CaseStatusFilter): void {
    this.statusFilter.set(status);
  }

  protected readonly categoryFilter = signal<CaseCategoryFilter>('all');

  updateCategoryFilter(category: CaseCategoryFilter): void {
    this.categoryFilter.set(category);
  }

  protected readonly threatLevelFilter = signal<ThreatLevelFilter>('all');

  updateThreatLevelFilter(threatLevel: ThreatLevelFilter): void {
    this.threatLevelFilter.set(threatLevel);
  }

  protected readonly regionFilter = signal<string>('all');

  updateRegionFilter(region: string): void {
    this.regionFilter.set(region);
  }

  resetFilters() {
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.threatLevelFilter.set('all');
    this.regionFilter.set('all');
  }

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
}
