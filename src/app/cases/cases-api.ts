import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { IncidentCase } from './case.model';
import type { CaseCreateDraft } from '../case-create-page/case-create-page.model';

@Service()
export class CasesApi {
  private readonly http = inject(HttpClient);

  getCases() {
    return this.http.get<readonly IncidentCase[]>('/api/cases', { timeout: 15000 });
  }

  createCase(draft: CaseCreateDraft, photo: File) {
    const body = new FormData();
    body.append('draft', JSON.stringify(draft));
    body.append('photo', photo);

    // Content-Type и границу между частями формы браузер добавит сам.
    return this.http.post<IncidentCase>('/api/cases', body, {
      headers: { 'X-Agency-CSRF': '1' },
      timeout: 180000,
    });
  }
}
