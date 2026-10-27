import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { form, FormField, required, FormRoot, maxLength, validate } from '@angular/forms/signals';
import type { CaseCreateDraft } from './case-create-page.model';
import { CasesApi } from '../cases/cases-api';
import { firstValueFrom } from 'rxjs';

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
  private readonly photoInput = viewChild.required<ElementRef<HTMLInputElement>>('photoInput');
  private cancelTrigger: HTMLButtonElement | undefined;
  protected readonly draft = signal<CaseCreateDraft>({ ...INITIAL_CASE_DRAFT });

  private readonly casesApi = inject(CasesApi);

  protected readonly saveError = signal<string | null>(null);

  protected readonly hasChanges = computed(() => {
    const draft = this.draft();

    return (
      draft.title !== INITIAL_CASE_DRAFT.title ||
      draft.description !== INITIAL_CASE_DRAFT.description ||
      draft.category !== INITIAL_CASE_DRAFT.category ||
      draft.threatLevel !== INITIAL_CASE_DRAFT.threatLevel ||
      draft.region !== INITIAL_CASE_DRAFT.region ||
      draft.locationDescription !== INITIAL_CASE_DRAFT.locationDescription ||
      draft.address !== INITIAL_CASE_DRAFT.address ||
      this.selectedPhoto() !== null
    );
  });

  protected cancel(trigger: HTMLButtonElement): void {
    if (this.caseForm().submitting()) return;
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

  protected readonly photoError = signal<string | null>(null);

  protected readonly selectedPhoto = signal<File | null>(null);

  protected readonly photoPreviewUrl = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const file = this.selectedPhoto();
      if (!file) {
        this.photoPreviewUrl.set(null);
        return;
      }

      // Локальный адрес для <img>; загрузки на сервер здесь нет.
      const url = URL.createObjectURL(file);
      this.photoPreviewUrl.set(url);

      // Освобождаем адрес при замене файла или уничтожении компонента.
      onCleanup(() => URL.revokeObjectURL(url));
    });
  }

  protected selectPhoto(event: Event): void {
    if (this.caseForm().submitting()) return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;

    const file = input.files?.[0] ?? null;
    if (!file) return;

    // The file lives in the signal; clearing the input allows selecting it again.
    input.value = '';

    this.photoError.set(null);
    this.selectedPhoto.set(null);

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      this.photoError.set('Выберите изображение JPEG, PNG или WebP.');
      return;
    }

    if (file.size === 0 || file.size > 5 * 1024 * 1024) {
      this.photoError.set('Фотография должна быть непустой и не превышать 5 МиБ.');
      return;
    }

    this.selectedPhoto.set(file);
  }

  protected removePhoto(): void {
    if (this.caseForm().submitting()) return;
    this.selectedPhoto.set(null);
    this.photoError.set(null);
    this.photoInput().nativeElement.value = '';
    this.photoInput().nativeElement.focus();
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
        onInvalid: () => {
          if (!this.selectedPhoto()) this.photoError.set('Добавьте фотографию дела.');
        },
        action: async () => {
          this.saveError.set(null);
          const photo = this.selectedPhoto();
          if (!photo) {
            this.photoError.set('Добавьте фотографию дела.');
            return;
          }

          let created;

          try {
            created = await firstValueFrom(this.casesApi.createCase(this.draft(), photo));
          } catch (error: unknown) {
            if (error instanceof HttpErrorResponse) {
              if (error.status === 401 || error.status === 403) {
                this.saveError.set(
                  'Нет доступа к созданию дела. Войдите снова. Черновик сохранён в форме.',
                );
                return;
              }
              const body: unknown = error.error;
              if (
                [400, 413, 415].includes(error.status) &&
                typeof body === 'object' &&
                body !== null &&
                'message' in body &&
                typeof body.message === 'string'
              ) {
                this.saveError.set(body.message);
                return;
              }
            }
            this.saveError.set(
              'Не удалось подтвердить сохранение. Данные и фото остались в форме. Перед повторной отправкой проверьте архив в другой вкладке, чтобы не создать дубликат.',
            );
            return;
          }

          await this.router.navigate(['/cases', created.id]);
        },
      },
    },
  );
}
