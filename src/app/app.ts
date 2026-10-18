import { Component, signal, computed, type Signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';
import { MOCK_CASES } from './cases/cases.mock';
import type { IncidentCase } from './cases/case.model';
import { CaseDetails } from './case-details/case-details';
import { CaseFilters } from './case-filters/case-filters';
import { CaseCategoryFilter, CaseStatusFilter } from './case-filters/case-filters.model';

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

  updateCaseStatus(status: CaseStatusFilter): void {
    this.statusFilter.set(status);
  }

  protected readonly categoryFilter = signal<CaseCategoryFilter>('all');

  updateCaseCategory(category: CaseCategoryFilter): void {
    this.categoryFilter.set(category);
  }

  protected readonly filteredCases = computed(() => {
    const status = this.statusFilter();
    const statusFilteredCases =
      status === 'all' ? this.cases : this.cases.filter((item) => item.status === status);

    const category = this.categoryFilter();
    const statusFilteredCategorisedCases =
      category === 'all'
        ? statusFilteredCases
        : statusFilteredCases.filter((item) => item.category === category);

    const query = this.searchQuery().trim().toLowerCase();
    if (query === '') return statusFilteredCategorisedCases;
    return statusFilteredCategorisedCases.filter((item) =>
      item.title.toLowerCase().includes(query),
    );
  });
}
