# Low-Code Demo: metadata-driven Angular forms

This project is a small but complete demo of a low-code frontend. Screens are described as JSON
configuration and rendered at runtime from precompiled Angular components. The domain is the
back office of an energy supplier (meter readings, instalment changes, complaints).

The goal is learning and interview preparation, so the code puts structure and explanatory
comments before visual polish.

## Commands

```sh
npm install
npx playwright install chromium   # once, for the E2E tests
npm start                         # http://localhost:4200
npm test                          # Vitest unit and component tests
npm run e2e                       # Playwright E2E tests with axe scans
```

| Route               | Content                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `/run/zaehlerstand` | Meter reading. The config is schema **v1** and is migrated on load.    |
| `/run/abschlag`     | Instalment change with a computed field and `requiredIf`.              |
| `/run/beschwerde`   | Complaint with nested sections, a FormArray and an escalation section. |
| `/run/kaputt`       | Broken config that shows the validation error panel.                   |
| `/builder`          | Visual editor with drag and drop, undo/redo, live preview and JSON.    |
| `/signal-forms`     | The Abschlag screen written by hand with Signal Forms.                 |

## Stack

Angular 22 (standalone, zoneless, OnPush by default), signals, Reactive Forms, `@ngrx/signals`,
Angular CDK drag and drop, Vitest, Playwright with `@axe-core/playwright`. There is no backend:
configs come from `public/configs/*.json` through `HttpClient`, and saving goes to an in-memory
service.

`ChangeDetectionStrategy.OnPush` is not written in the components, because it is the default
since Angular 22. Every component still runs as OnPush.

## Architecture

```
            public/configs/*.json
                     │  HttpClient (ConfigApiService)
                     ▼
  ┌────────────── core/schema ───────────────┐
  │ detectSchemaVersion → migrate v1→v2→v3   │  pure Visitor transforms
  │ → validateConfig (hand-written)          │  all issues at once
  └──────────────────┬───────────────────────┘
          ok         │          not ok
          ▼          └────────► ConfigErrorPanel
  ┌──────────── renderer ─────────────────────────────────────────────┐
  │ ScreenRenderer (mm-screen)                                        │
  │   ├─ FormRuntime (Mediator)                                       │
  │   │    form   = computed(buildForm(root))      FormGroup/FormArray │
  │   │    value  = raw value, bumped by valueChanges                 │
  │   │    rules  = computed(evaluateRules(root, value))  ◄── expressions/
  │   │    effect(applyRules)  enable/disable, add/removeValidators,  │
  │   │                        write computed values                  │
  │   └─ NODE_CONTEXT (root)                                          │
  │                                                                   │
  │ mm-child ── RENDER_MODE ──► mm-node            (NgComponentOutlet) │
  │                         └─► mm-node-imperative (createComponent)  │
  │        each node: resource(type → UI_REGISTRY loader)             │
  │                   per-node Injector with NODE_CONTEXT             │
  └──────────────────┬────────────────────────────────────────────────┘
                     ▼
  widgets/  section, repeat-list → render mm-child again (recursion)
            text/number/select/date/upload/textarea → ControlValueAccessor
                                    ▲
            FieldControlDirective (host directive) binds the FormControl
```

Folders:

| Folder         | Content                                                                                                    |
| -------------- | ---------------------------------------------------------------------------------------------------------- |
| `core/`        | Config types, `ConfigApiService`, `SubmissionService`, `schema/` (Visitor, migrations, validator, loader). |
| `expressions/` | Tokenizer, Pratt parser, AST, evaluator. Every stage returns a `Result`.                                   |
| `renderer/`    | Registry, node context, both renderers, form builder, rule engine, screen host, CVA adapter.               |
| `widgets/`     | Field widgets (CVA), `section`, `repeat-list`, `unknown-node` fallback.                                    |
| `builder/`     | SignalStore, commands, tree operations, palette, canvas, property panel, JSON view.                        |
| `pages/`       | Runtime page, builder page, Signal Forms page.                                                             |

### Config model (schema v3)

```json
{
  "id": "difference",
  "type": "number-field",
  "props": { "label": "Differenz in EUR" },
  "validators": { "min": 0 },
  "computed": "newInstalment - currentInstalment"
}
```

- `section` maps to a nested `FormGroup`, `repeat-list` maps to a `FormArray` of `FormGroup`s,
  and all other types map to a `FormControl`.
- Expressions reference values by their absolute dotted path (`complaint.priority`). Inside a
  repeat-list, `item.<id>` references the current item.
- `visibleIf` hides the node and disables its control, so that its validators do not block the
  save. `requiredIf` adds or removes `Validators.required`. `computed` writes its result into
  the control.

Schema history: v1 had a flat `fields` list with inline `label`/`required` and `showIf`. v2
introduced the node tree with `props`. v3 renamed the widget types to the registry keys and moved
the validation rules into `validators`.

### Expression language

Literals (`42`, `'text'`, `true`, `null`), field references, `== != < <= > >= && || !`,
`+ - * /`, unary `-`, and parentheses. The parser is a Pratt parser: the whole precedence table is
the `BINDING_POWER` map in `expressions/parser.ts`.

Errors are values, not exceptions. An unknown identifier, a type mismatch or a division by zero
produces `{ ok: false, error }`. The validator rejects unknown references at load time. At
runtime, an error makes a condition `false` and a computed value `null`. This matters because a
`computed()` that throws caches the error and rethrows it on every read.

### Adding a widget without changing the renderer

```ts
// app.config.ts
providers: [
  provideWidgets({
    'iban-field': () => import('./widgets/iban-field').then((m) => m.IbanField),
  }),
];
```

A widget must declare `node = input.required<UiNode>()`. A value widget must also provide
`NG_VALUE_ACCESSOR` and use `FieldControlDirective` as a host directive. Extending `FieldWidget`
gives both the value accessor and the control status. The contract suite in
`widgets/widget-contract.spec.ts` checks every registered widget.

## Design patterns

| Pattern            | Where                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composite          | `UiNode` tree; sections and lists contain nodes and render `mm-child` again. The form mirrors it with `FormGroup`/`FormArray`/`FormControl`.        |
| Interpreter        | `expressions/`: AST node kinds plus `evaluate()` with one case per kind.                                                                            |
| Registry / Factory | `UI_REGISTRY` maps a type to a lazy loader; `resolveWidget` falls back to `unknown`. `buildControl` is the factory for controls.                    |
| Adapter            | Each widget adapts a DOM element to `ControlValueAccessor`. `FieldControlDirective` adapts a `FormControl` to that accessor.                        |
| Strategy           | `RENDER_MODE` selects the declarative or the imperative renderer at runtime.                                                                        |
| Observer           | `control.events` and `valueChanges` streams, bridged to signals with `toSignal`/`toObservable`.                                                     |
| Mediator           | `FormRuntime`: fields never talk to each other. Every change goes through the runtime, which evaluates all rules and updates the affected controls. |
| Command            | `builder/commands.ts`: each edit has `execute` and `undo`; the store keeps `past` and `future` stacks.                                              |
| Memento            | `replaceConfigCommand` keeps snapshots before and after an import or a header change.                                                               |
| Visitor            | `core/schema/tree-visitor.ts`: `transformTree` with a visitor object, used by every migration.                                                      |

## Trade-offs

### `NgComponentOutlet` vs. `ViewContainerRef.createComponent`

Both renderers share the loading (`resource()`) and the context (`createChildContext`). Toggle
them on the runtime page with "Imperative renderer".

| Aspect        | `NgComponentOutlet` (`mm-node`)                                                                                                        | `createComponent` (`mm-node-imperative`)                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Code          | Declarative, a few template lines.                                                                                                     | Explicit: create, `setInput`, compare type, `destroy()`.                                                                   |
| Lifecycle     | Angular destroys the component with the view.                                                                                          | You must destroy it yourself (`DestroyRef.onDestroy`).                                                                     |
| Inputs        | `inputs` object; Angular diffs it.                                                                                                     | `setInput` per input, called from an effect.                                                                               |
| Re-creation   | Happens when the type **or the injector** changes. That is why the per-node injector is created once and `NODE_CONTEXT` holds signals. | Fully under your control.                                                                                                  |
| `@defer`      | Can wrap the outlet (`@defer (on viewport)` for upload).                                                                               | Not available; you would need your own `IntersectionObserver`.                                                             |
| Extra options | Content projection and an NgModule are possible.                                                                                       | `directives` and `bindings` (`inputBinding`, `outputBinding`) since v20, and the host element can be chosen.               |
| Placement     | Inside the template.                                                                                                                   | `inject(ViewContainerRef)` inserts **next to** the host. An inner `<ng-container #outlet>` anchor keeps the widget inside. |

I would choose `NgComponentOutlet` by default. `createComponent` is better when you need
directives on the dynamic component, an exact creation time, or rendering outside a template
(dialogs, overlays).

`@defer` with a dynamic type only delays the **instantiation**. Code splitting comes from the
`import()` in the registry: the defer block cannot lazy-load a type that it only knows at
runtime.

### Reactive Forms vs. Signal Forms

| Aspect            | Reactive Forms (main path)                                                                 | Signal Forms (`/signal-forms`)                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Source of truth   | The control tree holds the value.                                                          | A `WritableSignal` model holds the value; the field tree is derived from it.                             |
| Dynamic shape     | Built imperatively at runtime (`buildForm`). This fits metadata well.                      | The schema is TypeScript code. A runtime-generated schema is possible, but the typing advantage is lost. |
| Conditional rules | Manual: `addValidators`/`removeValidators` + `updateValueAndValidity`, `enable`/`disable`. | Declarative: `required(path, { when })`, `hidden`, `disabled`, `readonly`.                               |
| Reactivity        | Observables (`valueChanges`, `events`) bridged to signals.                                 | Signals directly: `field().errors()`, `touched()`, `required()`.                                         |
| Custom controls   | `ControlValueAccessor` (4 methods, provider boilerplate).                                  | `FormValueControl` with a `value` model; much less code.                                                 |
| Typing            | Typed forms exist, but not for a shape known only at runtime.                              | Typed from the model type.                                                                               |
| Maturity          | Long-time standard, very large ecosystem.                                                  | Newer API; parts of it are still changing between versions.                                              |

For a metadata-driven renderer, Reactive Forms are the better fit today, because the control tree
is data you can build and inspect at runtime. For hand-written screens with a known model I would
choose Signal Forms.

### SignalStore vs. classic NgRx Store

| Aspect       | `@ngrx/signals` SignalStore (used here)                                                           | Classic `@ngrx/store`                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Boilerplate  | State, computed values and methods in one place.                                                  | Actions, reducers, selectors and effects in separate files.                             |
| Scope        | Can be provided per component (`providers: [BuilderStore]`), so every builder visit starts fresh. | One global store; feature state is registered globally.                                 |
| Reads        | Signals; `computed` instead of memoised selectors.                                                | Observables via `select`, or `selectSignal`.                                            |
| Event log    | No action log by default; here the Command stack is the history.                                  | Every change is a serialisable action: strong DevTools time travel, logging and replay. |
| Side effects | `rxMethod`, or plain methods.                                                                     | `createEffect` with action streams.                                                     |

The builder is local, short-lived editor state, so SignalStore fits. The Command pattern gives
undo/redo without a global action log. For state that many features share, or when an audit
trail of every change matters, I would choose the classic store.

## Tests

- **Unit (Vitest):** table-driven tokenizer/parser/evaluator tests, migrations, the validator
  (one table row per issue), the form builder and the rule engine (including `requiredIf`
  toggling through `FormRuntime`), tree operations, and the builder store with undo/redo.
- **Widget contract suite:** `widgets/widget-contract.spec.ts` iterates over `DEFAULT_WIDGETS`.
  Every widget must render. Every value widget must be its own `NG_VALUE_ACCESSOR`, pair label
  and control through `for`/`id`, reflect `writeValue`, call `onChange` on input and `onTouched`
  on blur, and respect `setDisabledState`. A new value widget without a test sample fails the
  suite.
- **Renderer component tests:** run for both renderers. They cover the fallback for unknown
  types, `provideWidgets`, the instance identity per id after a config change, re-creation on a
  type change, and visibility.
- **E2E (Playwright):** `e2e/screens.ts` describes each sample screen as data, and
  `screens.spec.ts` generates one test per screen: required errors, conditional fields, valid
  save, and an axe scan in each state. `builder.spec.ts` covers drag, label edit, undo, redo and
  JSON export, plus import and run. Configs are served with `page.route`, selectors are
  `data-testid` only, and there are no fixed timeouts.

## Known limitations

- The validator runs the cross-node checks (unique ids, expression references) only when the
  structure is valid. A broken file can therefore show more issues after the first round of
  fixes.
- Leaf nodes of an unknown type still get a `FormControl`, so their (empty) value appears in the
  payload.
- The builder preview rebuilds the form on every config change, so values typed into the preview
  are reset.
- Hidden fields are disabled and are therefore missing from the saved payload. This is intended,
  but it is a domain decision.
- The imperative renderer does not defer the upload widget.
