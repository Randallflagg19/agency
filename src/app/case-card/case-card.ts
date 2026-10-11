import { Component, input, output } from '@angular/core';
import type { IncidentCase } from '../cases/case.model';

@Component({
  imports: [],
  selector: 'app-case-card',
  templateUrl: './case-card.html',
})
export class CaseCard {
  readonly incident = input.required<IncidentCase>();
  readonly caseSelected = output<string>();
  readonly selected = input(false);

  selectCase(): void {
    const incidentId = this.incident().id;

    this.caseSelected.emit(incidentId);
  }
}
