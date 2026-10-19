import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'cases/:caseId',
    title: 'Бюро аномальных происшествий',
    loadComponent: () => import('./archive-page/archive-page').then((module) => module.ArchivePage),
  },
  {
    path: '',
    title: 'Бюро аномальных происшествий',
    loadComponent: () => import('./archive-page/archive-page').then((module) => module.ArchivePage),
  },
];
