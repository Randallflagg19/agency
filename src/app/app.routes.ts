import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    // Одна запись маршрута сохраняет ArchivePage при выборе и закрытии дела.
    matcher: (segments) => {
      if (segments.length === 0) return { consumed: segments };

      if (segments.length === 2 && segments[0].path === 'cases') {
        return { consumed: segments, posParams: { caseId: segments[1] } };
      }

      return null;
    },
    title: 'Бюро аномальных происшествий',
    loadComponent: () => import('./archive-page/archive-page').then((module) => module.ArchivePage),
  },
];
