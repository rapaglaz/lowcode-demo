import { computed, Directive, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ControlValueAccessor } from '@angular/forms';
import { map, of, startWith, switchMap } from 'rxjs';
import { UiNode } from '../core/config.types';
import { domId, NODE_CONTEXT } from '../renderer/node-context';
import { errorMessages } from './error-messages';

type ControlStatus = { readonly errors: readonly string[]; readonly touched: boolean };
const NO_STATUS: ControlStatus = { errors: [], touched: false };

/**
 * Shared ControlValueAccessor plumbing for all field widgets. Subclasses only add
 * a template and the conversion from DOM events to values. The value lives in a
 * signal, so `writeValue` updates the OnPush view without any `markForCheck`.
 */
@Directive()
export abstract class FieldWidget<T> implements ControlValueAccessor {
  readonly node = input.required<UiNode>();

  protected readonly context = inject(NODE_CONTEXT);
  protected readonly value = signal<T | null>(null);
  protected readonly disabled = signal(false);

  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly baseId = computed(() => domId(this.context.path()));
  protected readonly inputId = computed(() => `input-${this.baseId()}`);
  protected readonly hintId = computed(() => `hint-${this.baseId()}`);
  protected readonly errorId = computed(() => `error-${this.baseId()}`);
  protected readonly testId = computed(() => `field-${this.baseId()}`);

  protected readonly label = computed(() => this.node().props?.label ?? this.node().id);
  protected readonly hint = computed(() => this.node().props?.hint ?? null);
  protected readonly placeholder = computed(() => this.node().props?.placeholder ?? null);
  protected readonly required = computed(() => this.context.state().required);
  protected readonly readOnly = computed(
    () =>
      this.context.readOnly() ||
      this.node().props?.readOnly === true ||
      this.node().computed !== undefined,
  );

  /**
   * Control status as a stream: `switchMap` drops the subscription of the previous
   * control when the builder rebuilds the form, so no listener leaks.
   */
  private readonly status = toSignal(
    toObservable(this.context.control).pipe(
      switchMap((control) =>
        control
          ? control.events.pipe(
              startWith(null),
              map(() => ({
                errors: errorMessages(control.errors, this.node()),
                touched: control.touched,
              })),
            )
          : of(NO_STATUS),
      ),
    ),
    { initialValue: NO_STATUS },
  );

  protected readonly errors = computed(() =>
    this.status().touched && !this.disabled() ? this.status().errors : [],
  );
  protected readonly invalid = computed(() => this.errors().length > 0);
  protected readonly describedBy = computed(
    () =>
      [this.hint() ? this.hintId() : null, this.invalid() ? this.errorId() : null]
        .filter(Boolean)
        .join(' ') || null,
  );

  writeValue(value: unknown): void {
    this.value.set(this.fromModel(value));
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  /** Converts an incoming model value; subclasses narrow it to their value type. */
  protected abstract fromModel(value: unknown): T | null;

  protected emit(value: T | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected touch(): void {
    this.onTouched();
  }
}
