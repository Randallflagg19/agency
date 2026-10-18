import { Component, input, output } from '@angular/core';
import type { CaseCategoryFilter, CaseStatusFilter, ThreatLevelFilter } from './case-filters.model';
import type { ThreatLevel } from '../cases/case.model';

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

  readonly threatLevel = input.required<ThreatLevelFilter>();
  readonly threatLevelChanged = output<ThreatLevelFilter>();

  emitThreatLevelChange(threatLevel: string): void {
    const level = threatLevel === 'all' ? 'all' : (Number(threatLevel) as ThreatLevel);
    this.threatLevelChanged.emit(level);
  }

  readonly resetButtonClicked = output();

  emitFiltersReset() {
    this.resetButtonClicked.emit();
    console.log('231');
  }
}
