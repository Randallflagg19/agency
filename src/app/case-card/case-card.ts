import { Component, input } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-case-card',
  templateUrl: './case-card.html',
})
export class CaseCard {
  readonly caseNumber = input.required<string>();
  readonly caseTitle = input.required<string>();
}
