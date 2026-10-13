import { Component, signal, computed, type Signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';
import { MOCK_CASES } from './cases/cases.mock';
import type { IncidentCase } from './cases/case.model';
import { CaseDetails } from './case-details/case-details';
import { CaseFilters } from './case-filters/case-filters';

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

  protected readonly filteredCases = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (query === '') return this.cases;
    return this.cases.filter((item) => item.title.toLowerCase().includes(query));
  });
}
