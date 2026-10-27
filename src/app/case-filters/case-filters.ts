import { Component, input, output } from '@angular/core';
import type { CaseCategoryFilter, CaseStatusFilter, ThreatLevelFilter } from './case-filters.model';
import type { ThreatLevel } from '../cases/case.model';

@Component({
  selector: 'app-case-filters',
  styleUrl: './case-filters.css',
  templateUrl: './case-filters.html',
})
export class CaseFilters {
  readonly checkingSession = input(false);
  readonly newCaseRequested = output<HTMLButtonElement>();

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
    if (threatLevel === 'unrated') {
      this.threatLevelChanged.emit(null);
      return;
    }
    const level = threatLevel === 'all' ? 'all' : (Number(threatLevel) as ThreatLevel);
    this.threatLevelChanged.emit(level);
  }

  readonly regions = input.required<string[]>();

  readonly region = input.required<string>();
  readonly regionChanged = output<string>();

  emitRegionChange(region: string) {
    this.regionChanged.emit(region);
  }

  readonly resetButtonClicked = output();

  emitFiltersReset() {
    this.resetButtonClicked.emit();
  }
}
