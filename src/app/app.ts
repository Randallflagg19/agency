import { Component, signal } from '@angular/core';
import { CaseCard } from './case-card/case-card';
import type { IncidentCase } from './cases/case.model';
import { MOCK_CASES } from './cases/cases.mock';

@Component({
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  imports: [CaseCard],
})
export class App {
  protected readonly selectedCaseId = signal<string | null>(null);

  handleCaseSelected(caseId: string) {
    this.selectedCaseId.set(caseId);
  }

  protected readonly cases = MOCK_CASES;
}
