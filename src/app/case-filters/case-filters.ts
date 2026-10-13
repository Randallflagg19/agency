import { Component, input, output } from '@angular/core';

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
}
