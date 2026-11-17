import { Routes } from '@angular/router';

/** Every page is a lazy chunk. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'run/zaehlerstand' },
  {
    path: 'run/:id',
    loadComponent: () => import('./pages/runtime-page').then((m) => m.RuntimePage),
    title: 'Formular',
  },
  { path: '**', redirectTo: 'run/zaehlerstand' },
];
