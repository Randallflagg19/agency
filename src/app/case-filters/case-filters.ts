import { Component, input, output } from '@angular/core';
import type { CaseCategoryFilter, CaseStatusFilter } from './case-filters.model';

@Component({
  imports: [],
  selector: 'app-case-filters',
  styleUrl: './case-filters.css',
  templateUrl: './case-filters.html',
})
export class CaseFilters {
  readonly query = input.required<string>();
  readonly queryChanged = output<string>();

  emitQueryChange(value: string) {
    this.queryChanged.emit(value);
  }

  readonly status = input.required<CaseStatusFilter>();
  readonly statusChanged = output<CaseStatusFilter>();

  emitStatusChange(status: string): void {
    this.statusChanged.emit(status as CaseStatusFilter);
  }

  readonly category = input.required<CaseCategoryFilter>();
  readonly categoryChanged = output<CaseCategoryFilter>();

  emitCategoryChange(category: string): void {
    this.categoryChanged.emit(category as CaseCategoryFilter);
  }
}
