import { Component, input } from '@angular/core';
import type { IncidentCase } from '../cases/case.model';

@Component({
  imports: [],
  selector: 'app-case-details',
  styleUrl: './case-details.css',
  templateUrl: './case-details.html',
})
export class CaseDetails {
  readonly selectedCase = input.required<IncidentCase>();
}
