import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-case-not-found',
  imports: [RouterLink],
  styleUrl: './case-not-found.css',
  template: `
    <section class="archive-notice" aria-labelledby="case-not-found-title">
      <span class="archive-notice__stamp" aria-hidden="true">Нет в архиве</span>

      <div class="archive-notice__content">
        <svg
          class="archive-notice__folder"
          viewBox="0 0 160 120"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M21 100 14 25q0-5 5-5h39l10-9h64q5 0 5 5v18" />
          <path d="m27 96-4-64q0-5 5-5h40l9-8h48" />
          <path d="m35 101 8-56q1-5 6-5h94q6 0 4 6l-16 51q-1 5-7 5H29q-7 0-8-6" />
          <path d="m37 78 5-38q1-6 7-6h83M29 37l3 42M49 94h66" opacity=".45" />
        </svg>

        <p class="archive-notice__eyebrow">Архивная справка</p>
        <h3 id="case-not-found-title">Дело не найдено</h3>
        <div class="archive-notice__divider" aria-hidden="true"></div>

        <a class="archive-notice__return" routerLink="/">
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
            <path d="M20 12H4m7-7-7 7 7 7" />
          </svg>
          Вернуться в архив
        </a>
      </div>
    </section>
  `,
})
export class CaseNotFound {}
