import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

@Component({
  imports: [FormField],
  selector: 'app-case-create-page',
  styleUrl: './case-create-page.css',
  templateUrl: './case-create-page.html',
})
export class CaseCreatePage {
  protected readonly draft = signal({
    title: '',
  });

  protected readonly caseForm = form(this.draft, (schema) => {
    required(schema.title, {
      message: 'Введите название дела',
    });
  });
}
