You are a senior Angular engineer. Build a small but complete demo of a **metadata-driven, low-code Angular frontend**: screens are described as JSON configuration and rendered at runtime from precompiled components. The goal is learning and interview preparation, so code quality, clear structure and explanatory comments matter more than visual polish.

## Tech constraints

- Latest stable Angular (v22 at the time of writing), created with `npx @angular/cli@latest new lowcode-demo --style=scss --ssr=false` - you are in app, app is created
- Standalone components only, zoneless change detection, `ChangeDetectionStrategy.OnPush` everywhere
- Signals for state (`signal`, `computed`, `linkedSignal` where useful), signal inputs (`input`, `input.required`, `model`, `output`)
- RxJS only where streams make sense (debounced search, cancellable requests); bridge with `toSignal` / `toObservable`
- Reactive Forms with a custom `ControlValueAccessor` per widget (do not use Signal Forms in the main path; add one small isolated example screen using Signal Forms for comparison)
- `@ngrx/signals` SignalStore for the builder state
- Angular CDK for drag and drop
- Vitest for unit/component tests, Playwright with `@axe-core/playwright` for E2E
- No backend: serve configurations from `public/configs/*.json` via `HttpClient`, simulate save with an in-memory service
- No `eval`, no `new Function`, no `bypassSecurityTrust*`
- TypeScript `strict: true`; English code comments; no placeholders or TODO stubs

## Domain

Energy industry back office. Provide three sample configurations:

1. `zaehlerstand.json`: "Zählerstand erfassen" (meter number with required + pattern validation, reading type select Kunde/Monteur, photo upload visible only if Monteur, reading date, numeric reading with min)
2. `abschlag.json`: "Abschlag ändern" (customer number, current instalment read-only, new instalment number field, computed difference field, reason textarea required if difference > 50)
3. `beschwerde.json`: "Beschwerde erfassen" (nested sections, repeatable list of contact attempts using a FormArray, priority select, conditional escalation section)

## Architecture (feature folders)

```
src/app/
  core/         config.types.ts, config-api.service.ts, schema/ (validation + migrations)
  renderer/     ui-registry.ts, node-renderer.ts, node-context.ts, form-builder.ts
  expressions/  tokenizer.ts, parser.ts (AST), evaluator.ts
  widgets/      text-field, number-field, select-field, date-field, upload-field,
                textarea-field, section, repeat-list, unknown-node
  builder/      builder.store.ts (SignalStore), palette, canvas, property-panel, json-view
  pages/        runtime-page (render a config by id), builder-page, signal-forms-page
```

## Required features

1. **Config model** (`UiNode`: `id`, `type`, `props`, `children`, `visibleIf`, `requiredIf`, `computed`) with a `schemaVersion`. Validate configs on load with a hand-written validator and migrate v1 -> v2 -> v3 with pure migration functions (Visitor over the tree). Ship one v1 config to prove migration works.
2. **Registry** as an `InjectionToken<Record<string, () => Promise<Type<unknown>>>>` with lazy `import()` per widget and an `unknown` fallback widget. Allow extra widgets to be registered via a provider without touching the renderer (Open/Closed).
3. **Recursive renderer** `mm-node` using `resource()` to load the component type and `NgComponentOutlet` with `inputs` and a per-node `Injector` (`NODE_CONTEXT`: path, readOnly). Containers render children with `@for (...; track child.id)`.
4. **Imperative variant**: a second renderer `mm-node-imperative` using `ViewContainerRef.createComponent` + `setInput` + `destroy()`, switchable via a toggle, to compare both approaches.
5. **Form building**: build a `FormGroup`/`FormArray` from the config tree; map `required`, `min`, `max`, `pattern` to validators; apply `requiredIf` dynamically with `addValidators`/`removeValidators` + `updateValueAndValidity`.
6. **Widgets** implement `ControlValueAccessor` (`NG_VALUE_ACCESSOR`, `useExisting`, `forwardRef`, `multi: true`), show label, error messages and correct `aria-*`; ids derived from node ids; `data-testid="field-<id>"`.
7. **Expressions**: tokenizer -> parser -> AST -> evaluator supporting literals, field references, `== != < <= > >= && || !`, `+ - * /` and parentheses. Unknown identifiers or operators produce an error result, never an exception that breaks rendering. Evaluate in `computed()`.
8. **Builder page**: palette of widget types, canvas with CDK drag-drop to add/reorder nodes, property panel to edit props, live preview using the same renderer, JSON view, undo/redo implemented with the Command pattern on top of the SignalStore, plus export/import of the JSON.
9. **Performance**: `@defer (on viewport)` for the upload widget, OnPush everywhere, no function calls with side effects in templates.
10. **Error handling**: invalid config shows a readable error panel listing validation messages.

## Tests

- Unit (Vitest): parser and evaluator (table-driven), migrations, schema validator, form builder.
- Contract test suite that runs automatically for **every** registered widget: renders it, checks `writeValue`, `onChange` on input, `onTouched` on blur, `setDisabledState`, label/`for` pairing.
- Component tests for the renderer: unknown type shows fallback; changing config keeps component instances with the same id.
- E2E (Playwright): one generated test per sample config that loads the config, asserts required-field errors, fills valid data, toggles conditional fields, saves; axe scan with zero violations on every screen; one builder flow (drag a field, edit label, undo, redo, export JSON).
- Use `page.route` to serve fixtures; stable `data-testid` selectors only; no fixed timeouts.

## Deliverables

- Working app (`npm start`), `npm test`, `npm run e2e`
- `README.md` explaining the architecture with a short diagram, which design patterns are used where (Composite, Interpreter, Registry/Factory, Adapter via CVA, Strategy, Observer, Mediator, Command, Memento, Visitor), and the trade-offs between `NgComponentOutlet` and `createComponent`, Reactive Forms and Signal Forms, and SignalStore vs. classic NgRx store
- Work in small commits with clear messages

Start by printing a short implementation plan, then build it step by step, running the tests after each major step.
