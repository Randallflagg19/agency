import { Component, input } from '@angular/core';
import type { IncidentCase } from '../cases/case.model';

@Component({
  imports: [],
  selector: 'app-case-card',
  templateUrl: './case-card.html',
})
export class CaseCard {
  readonly incident = input.required<IncidentCase>();
}
