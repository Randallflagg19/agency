import { Component, signal, computed, type Signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';
import { MOCK_CASES } from './cases/cases.mock';
import type { IncidentCase } from './cases/case.model';
import { CaseDetails } from './case-details/case-details';
import { CaseFilters } from './case-filters/case-filters';
import type {
  CaseCategoryFilter,
  CaseStatusFilter,
  ThreatLevelFilter,
} from './case-filters/case-filters.model';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [CaseCard, CaseDetails, CaseFilters],
})
export class App {
  protected readonly cases = MOCK_CASES;
  protected readonly selectedCaseId = signal<string | null>(null);

  handleCaseSelected(caseId: string) {
    this.selectedCaseId.set(caseId);
  }

  protected readonly selectedCase: Signal<IncidentCase | null> = computed(() => {
    return this.cases.find((item) => item.id === this.selectedCaseId()) ?? null;
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

  resetFilters() {
    this.statusFilter.set('all');
    this.categoryFilter.set('all');
    this.threatLevelFilter.set('all');
    console.log('231');
  }

  protected readonly filteredCases = computed(() => {
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const threatLevel = this.threatLevelFilter();
    const query = this.searchQuery().trim().toLowerCase();

    return this.cases.filter((item) => {
      const matchesStatus = status === 'all' || item.status === status;
      const matchesCategory = category === 'all' || item.category === category;
      const matchesThreatLevel = threatLevel === 'all' || item.threatLevel === threatLevel;
      const matchesQuery = query === '' || item.title.toLowerCase().includes(query);

      return matchesStatus && matchesCategory && matchesThreatLevel && matchesQuery;
    });
  });
}
