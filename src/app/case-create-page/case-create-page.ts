import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, signal } from '@angular/core';
import { form, FormField, required, FormRoot, maxLength } from '@angular/forms/signals';
import type { CaseCreateDraft } from './case-create-page.model';

@Component({
  imports: [FormField, FormRoot, NgOptimizedImage, RouterLink],
  selector: 'app-case-create-page',
  styleUrl: './case-create-page.css',
  templateUrl: './case-create-page.html',
})
export class CaseCreatePage {
  protected readonly draft = signal<CaseCreateDraft>({
    title: '',
    description: '',
    category: 'unknown',
    threatLevel: null,
    region: '',
    locationDescription: '',
    address: '',
  });

  protected readonly caseForm = form(
    this.draft,

    (schema) => {
      required(schema.title, {
        message: 'Введите название дела',
      });
      maxLength(schema.title, 150, {
        message: 'Название должно содержать не больше 150 символов',
      });
      required(schema.description, {
        message: 'Введите описание дела',
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
