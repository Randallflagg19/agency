import { Component, input, output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import type { IncidentCase } from '../cases/case.model';

@Component({
  imports: [NgOptimizedImage],
  selector: 'app-case-card',
  templateUrl: './case-card.html',
  styleUrl: './case-card.css',
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
