import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { IncidentCase } from './case.model';

@Service()
export class CasesApi {
  private readonly http = inject(HttpClient);

  getCases() {
    return this.http.get<readonly IncidentCase[]>('/api/cases', { timeout: 15000 });
  }
}
