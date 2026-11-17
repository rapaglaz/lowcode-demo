import { InjectionToken, signal, Signal } from '@angular/core';

export type RenderMode = 'declarative' | 'imperative';

/** Selects the renderer for child nodes; pages provide their own writable signal. */
export const RENDER_MODE = new InjectionToken<Signal<RenderMode>>('RENDER_MODE', {
  providedIn: 'root',
  factory: () => signal<RenderMode>('declarative'),
});
