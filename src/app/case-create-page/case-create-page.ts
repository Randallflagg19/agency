import { Component, signal } from '@angular/core';
import { form, FormField, required, FormRoot } from '@angular/forms/signals';
import type { CaseCreateDraft } from './case-create-page.model';

@Component({
  imports: [FormField, FormRoot],
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
      required(schema.description, {
        message: 'Введите описание дела',
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
