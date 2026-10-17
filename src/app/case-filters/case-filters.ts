import { Component, input, output } from '@angular/core';
import { CaseStatusFilter } from './case-filters.model';

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
  readonly statusChanged = output<string>();

  emitStatusChange(status: string) {
    this.statusChanged.emit(status);
  }
}
