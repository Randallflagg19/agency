import { NgOptimizedImage } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import type { IncidentCase } from '../cases/case.model';
import { ClassifiedStamp } from '../classified-stamp/classified-stamp';
import { createCaseMetadata } from '../cases/case-metadata.presenter';

@Component({
  imports: [ClassifiedStamp, NgOptimizedImage],
  selector: 'app-case-details',
  styleUrl: './case-details.css',
  templateUrl: './case-details.html',
})
export class CaseDetails {
  readonly selectedCase = input.required<IncidentCase>();
  protected readonly metadata = computed(() => createCaseMetadata(this.selectedCase()));
  protected readonly threatSteps = [1, 2, 3, 4, 5] as const;
}
