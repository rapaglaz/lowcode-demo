import { Component, computed, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldControlDirective } from '../renderer/field-control.directive';
import { FieldLabel } from './field-label';
import { FieldMessages } from './field-messages';
import { FieldWidget } from './field-widget';

@Component({
  selector: 'mm-number-field',
  imports: [FieldLabel, FieldMessages],
  hostDirectives: [FieldControlDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => NumberField), multi: true },
  ],
  template: `
    <div class="field">
      <mm-field-label [for]="inputId()" [text]="label()" [required]="required()" />
      <input
        #input
        type="number"
        inputmode="decimal"
        [id]="inputId()"
        [value]="value() ?? ''"
        [attr.min]="min()"
        [attr.max]="max()"
        [attr.step]="step()"
        [disabled]="disabled()"
        [readOnly]="readOnly()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [attr.aria-live]="isComputed() ? 'polite' : null"
        [attr.data-testid]="testId()"
        (input)="emit(parse(input.value))"
        (blur)="touch()"
      />
      <mm-field-messages
        [baseId]="baseId()"
        [hintId]="hintId()"
        [errorId]="errorId()"
        [hint]="hint()"
        [errors]="errors()"
      />
    </div>
  `,
})
export class NumberField extends FieldWidget<number> {
  protected readonly min = computed(() => this.node().validators?.min ?? null);
  protected readonly max = computed(() => this.node().validators?.max ?? null);
  protected readonly step = computed(
    () => (this.node().props?.['step'] as number | undefined) ?? 'any',
  );
  /** Computed fields announce their new value to screen readers. */
  protected readonly isComputed = computed(() => this.node().computed !== undefined);

  /** An empty or incomplete number is `null`, so that `required` reports it. */
  protected parse(raw: string): number | null {
    if (raw.trim() === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  protected fromModel(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }
}
