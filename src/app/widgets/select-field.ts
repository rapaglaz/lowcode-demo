import { Component, computed, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldControlDirective } from '../renderer/field-control.directive';
import { FieldLabel } from './field-label';
import { FieldMessages } from './field-messages';
import { FieldWidget } from './field-widget';

@Component({
  selector: 'mm-select-field',
  imports: [FieldLabel, FieldMessages],
  hostDirectives: [FieldControlDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectField), multi: true },
  ],
  template: `
    <div class="field">
      <mm-field-label [for]="inputId()" [text]="label()" [required]="required()" />
      <!-- A select has no readonly state, so read-only mode disables it. -->
      <select
        #input
        [id]="inputId()"
        [disabled]="disabled() || readOnly()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [attr.data-testid]="testId()"
        (change)="emit(input.value === '' ? null : input.value)"
        (blur)="touch()"
      >
        <option value="" [selected]="value() === null">Bitte wählen</option>
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === value()">
            {{ option.label }}
          </option>
        }
      </select>
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
export class SelectField extends FieldWidget<string> {
  protected readonly options = computed(() => this.node().props?.options ?? []);

  /** Values that are not among the options are ignored instead of shown as an empty selection. */
  protected fromModel(value: unknown): string | null {
    return typeof value === 'string' && this.options().some((o) => o.value === value)
      ? value
      : null;
  }
}
