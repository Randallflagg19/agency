import { Component, output } from '@angular/core';

@Component({
  selector: 'app-cases-empty',
  styleUrl: './cases-empty.css',
  template: `
    <section class="empty-results" aria-labelledby="empty-results-title">
      <svg
        class="empty-results__illustration"
        viewBox="0 0 160 120"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="m24 99-6-73q0-5 5-5h35l10-9h55q5 0 5 5v20" />
        <path d="m31 95-4-61q0-5 5-5h34l9-9h45" />
        <path d="m36 100 7-54q1-5 6-5h86q5 0 4 5l-5 19M24 99h71" />
        <path d="M51 54h35M49 64h27M47 75h25M45 86h29" opacity=".45" />
        <circle cx="109" cy="76" r="24" />
        <circle cx="109" cy="76" r="19" opacity=".6" />
        <path d="m125 94 20 20q3 3 6 0t0-6l-20-20M95 73q2-9 11-11" />
      </svg>

      <h3 id="empty-results-title">Подходящие дела не найдены</h3>
      <p>Попробуйте изменить условия поиска или сбросить фильтры.</p>
      <div class="empty-results__divider" aria-hidden="true"></div>

      <button type="button" (click)="resetRequested.emit()">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 10a8 8 0 1 1 1 6M4 4v6h6" />
        </svg>
        Сбросить поиск и фильтры
      </button>
    </section>
  `,
})
export class CasesEmpty {
  readonly resetRequested = output<void>();
}
