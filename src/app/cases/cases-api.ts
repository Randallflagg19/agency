import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { IncidentCase } from './case.model';
import { CaseCreateDraft } from '../case-create-page/case-create-page.model';

@Service()
export class CasesApi {
  private readonly http = inject(HttpClient);

  getCases() {
    return this.http.get<readonly IncidentCase[]>('/api/cases', { timeout: 15000 });
  }

  createCase(draft: CaseCreateDraft) {
    return this.http.post<IncidentCase>('/api/cases', draft, {
      headers: { 'X-Agency-CSRF': '1' },
      timeout: 15000,
    });
  }
}
