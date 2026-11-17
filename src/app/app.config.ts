import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Zoneless is the default since v21; the explicit call documents the intent.
    provideZonelessChangeDetection(),
    provideHttpClient(withFetch()),
    // Route params (e.g. `:id`) arrive as signal inputs on routed components.
    provideRouter(routes, withComponentInputBinding()),
  ],
};
