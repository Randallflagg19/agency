import { Routes } from '@angular/router';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  {
    path: 'cases/new',
    canActivate: [adminGuard],
    title: 'Новое дело',
    loadComponent: () =>
      import('./case-create-page/case-create-page').then((module) => module.CaseCreatePage),
  },
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
