import { Routes } from '@angular/router';

/** Every page is a lazy chunk. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'run/zaehlerstand' },
  {
    path: 'run/:id',
    loadComponent: () => import('./pages/runtime-page').then((m) => m.RuntimePage),
    title: 'Formular',
  },
  {
    path: 'builder',
    loadComponent: () => import('./pages/builder-page').then((m) => m.BuilderPage),
    title: 'Builder',
  },
  {
    path: 'signal-forms',
    loadComponent: () => import('./pages/signal-forms-page').then((m) => m.SignalFormsPage),
    title: 'Signal Forms',
  },
  { path: '**', redirectTo: 'run/zaehlerstand' },
];
