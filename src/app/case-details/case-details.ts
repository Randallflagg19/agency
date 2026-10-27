import { NgOptimizedImage } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import type { CaseDeletionResult } from '../cases/case-deletion.model';
import { CaseDeleteDialog } from './case-delete-dialog/case-delete-dialog';
import type { IncidentCase } from '../cases/case.model';
import { ClassifiedStamp } from '../classified-stamp/classified-stamp';
import { createCaseMetadata } from '../cases/case-metadata.presenter';

@Component({
  imports: [ClassifiedStamp, NgOptimizedImage, CaseDeleteDialog],
  selector: 'app-case-details',
  styleUrl: './case-details.css',
  templateUrl: './case-details.html',
})
export class CaseDetails {
  readonly selectedCase = input.required<IncidentCase>();
  readonly deleted = output<CaseDeletionResult>();
  private readonly auth = inject(AuthService);
  protected readonly canDelete = computed(() => {
    const state = this.auth.state();
    return state.status === 'authenticated' && state.user.role === 'admin';
  });
  protected readonly metadata = computed(() => createCaseMetadata(this.selectedCase()));
  protected readonly threatSteps = [1, 2, 3, 4, 5] as const;
}
