import { inject, InjectionToken, Provider, Type } from '@angular/core';

export type WidgetLoader = () => Promise<Type<unknown>>;
export type WidgetRegistry = Readonly<Record<string, WidgetLoader>>;

/** Registry key of the fallback widget for types without a registration. */
export const UNKNOWN_WIDGET = 'unknown';

/**
 * Built-in widgets. Every entry is a dynamic `import()`, so each widget is its
 * own lazy chunk and is only downloaded when a screen uses it.
 */
export const DEFAULT_WIDGETS: WidgetRegistry = {
  'text-field': () => import('../widgets/text-field').then((m) => m.TextField),
  'number-field': () => import('../widgets/number-field').then((m) => m.NumberField),
  'select-field': () => import('../widgets/select-field').then((m) => m.SelectField),
  'date-field': () => import('../widgets/date-field').then((m) => m.DateField),
  'upload-field': () => import('../widgets/upload-field').then((m) => m.UploadField),
  'textarea-field': () => import('../widgets/textarea-field').then((m) => m.TextareaField),
  section: () => import('../widgets/section').then((m) => m.Section),
  'repeat-list': () => import('../widgets/repeat-list').then((m) => m.RepeatList),
  [UNKNOWN_WIDGET]: () => import('../widgets/unknown-node').then((m) => m.UnknownNode),
};

/** Multi-provider for additional widgets; see `provideWidgets`. */
export const EXTRA_WIDGETS = new InjectionToken<readonly WidgetRegistry[]>('EXTRA_WIDGETS');

/**
 * The registry the renderers use (Registry + Factory). Extra registrations are merged
 * over the defaults, so a provider can add or replace widgets without any change
 * to the renderer (Open/Closed principle).
 */
export const UI_REGISTRY = new InjectionToken<WidgetRegistry>('UI_REGISTRY', {
  providedIn: 'root',
  factory: () =>
    Object.assign({}, DEFAULT_WIDGETS, ...(inject(EXTRA_WIDGETS, { optional: true }) ?? [])),
});

/** Registers additional widgets, e.g. `provideWidgets({ 'iban-field': () => import(...) })`. */
export function provideWidgets(widgets: WidgetRegistry): Provider {
  return { provide: EXTRA_WIDGETS, useValue: widgets, multi: true };
}

/** Unknown types resolve to the fallback widget instead of failing. */
export function resolveWidget(registry: WidgetRegistry, type: string): WidgetLoader {
  return registry[type] ?? registry[UNKNOWN_WIDGET];
}

/** Widget types that are rendered inside `@defer (on viewport)` by the declarative renderer. */
export const DEFERRED_WIDGETS: ReadonlySet<string> = new Set(['upload-field']);
