import { computed, effect, InjectionToken, Signal, signal } from '@angular/core';
import { UiNode } from '../core/config.types';
import { buildForm, DynamicGroup } from './form-builder';
import { applyRules, evaluateRules, RuleSnapshot } from './rule-engine';

/**
 * Connects a config tree with its FormGroup (Mediator pattern): fields never talk
 * to each other; every value change flows through this object, which evaluates
 * all rules and pushes the results back into the controls.
 * Must be created in an injection context because it registers effects.
 */
export class FormRuntime {
  readonly form: Signal<DynamicGroup>;
  /** Raw value including disabled (hidden) controls; expressions need all of them. */
  readonly value: Signal<Readonly<Record<string, unknown>>>;
  readonly rules: Signal<RuleSnapshot>;

  /** Bumped on every `valueChanges` emission; bridges the Observable into the signal graph. */
  private readonly changes = signal(0);

  constructor(readonly root: Signal<UiNode>) {
    this.form = computed(() => buildForm(this.root()));
    this.value = computed(() => {
      this.changes();
      return this.form().getRawValue();
    });
    this.rules = computed(() => evaluateRules(this.root(), this.value()));

    effect((onCleanup) => {
      const subscription = this.form().valueChanges.subscribe(() =>
        this.changes.update((n) => n + 1),
      );
      onCleanup(() => subscription.unsubscribe());
    });

    effect(() => applyRules(this.form(), this.root(), this.rules()));
  }
}

/** Provided by the component that hosts a rendered screen. */
export const FORM_RUNTIME = new InjectionToken<FormRuntime>('FORM_RUNTIME');
