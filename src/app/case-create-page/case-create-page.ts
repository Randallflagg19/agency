import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField, required, FormRoot, maxLength, validate } from '@angular/forms/signals';
import type { CaseCreateDraft } from './case-create-page.model';

const INITIAL_CASE_DRAFT: CaseCreateDraft = {
  title: '',
  description: '',
  category: 'unknown',
  threatLevel: null,
  region: '',
  locationDescription: '',
  address: '',
};

@Component({
  imports: [FormField, FormRoot, NgOptimizedImage],
  selector: 'app-case-create-page',
  styleUrl: './case-create-page.css',
  templateUrl: './case-create-page.html',
})
export class CaseCreatePage {
  private readonly router = inject(Router);
  private readonly cancelDialog = viewChild.required<ElementRef<HTMLDialogElement>>('cancelDialog');
  private cancelTrigger: HTMLButtonElement | undefined;
  protected readonly draft = signal<CaseCreateDraft>({ ...INITIAL_CASE_DRAFT });

  protected readonly hasChanges = computed(() => {
    const draft = this.draft();

    return (
      draft.title !== INITIAL_CASE_DRAFT.title ||
      draft.description !== INITIAL_CASE_DRAFT.description ||
      draft.category !== INITIAL_CASE_DRAFT.category ||
      draft.threatLevel !== INITIAL_CASE_DRAFT.threatLevel ||
      draft.region !== INITIAL_CASE_DRAFT.region ||
      draft.locationDescription !== INITIAL_CASE_DRAFT.locationDescription ||
      draft.address !== INITIAL_CASE_DRAFT.address
    );
  });

  protected cancel(trigger: HTMLButtonElement): void {
    if (this.hasChanges()) {
      this.cancelTrigger = trigger;
      this.cancelDialog().nativeElement.showModal();
      return;
    }

    this.leaveWithoutSaving();
  }

  protected continueEditing(): void {
    this.cancelDialog().nativeElement.close();
  }

  protected restoreCancelFocus(): void {
    this.cancelTrigger?.focus();
    this.cancelTrigger = undefined;
  }

  protected leaveWithoutSaving(): void {
    void this.router.navigate(['/']);
  }

  protected readonly caseForm = form(
    this.draft,

    (schema) => {
      required(schema.title, {
        message: 'Введите название дела',
      });
      validate(schema.title, ({ value }) => {
        const title = value();
        if (title.length > 0 && title.trim().length === 0) {
          return {
            kind: 'whitespace',
            message: 'Название не должно состоять только из пробелов',
          };
        }
        return undefined;
      });
      maxLength(schema.title, 150, {
        message: 'Название должно содержать не больше 150 символов',
      });
      required(schema.description, {
        message: 'Введите описание дела',
      });
      validate(schema.description, ({ value }) => {
        const description = value();
        if (description.length > 0 && description.trim().length === 0) {
          return {
            kind: 'whitespace',
            message: 'Описание не должно состоять только из пробелов',
          };
        }
        return undefined;
      });
      maxLength(schema.description, 10000, {
        message: 'Описание дела должно содержать не больше 10000 символов',
      });
      maxLength(schema.region, 150, {
        message: 'Регион должен содержать не больше 150 символов',
      });
      maxLength(schema.locationDescription, 1000, {
        message: 'Описание локации должно содержать не больше 1000 символов',
      });
      maxLength(schema.address, 300, {
        message: 'Адрес должен содержать не больше 300 символов',
      });
    },
    {
      submission: {
        action: async () => {
          console.log(this.draft());
        },
      },
    },
  );
}
