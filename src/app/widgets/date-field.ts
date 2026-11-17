import { Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldControlDirective } from '../renderer/field-control.directive';
import { FieldLabel } from './field-label';
import { FieldMessages } from './field-messages';
import { FieldWidget } from './field-widget';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The value is an ISO date string (`2026-11-17`), which is stable to serialise and to compare. */
@Component({
  selector: 'mm-date-field',
  imports: [FieldLabel, FieldMessages],
  hostDirectives: [FieldControlDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true },
  ],
  template: `
    <div class="field">
      <mm-field-label [for]="inputId()" [text]="label()" [required]="required()" />
      <input
        #input
        type="date"
        [id]="inputId()"
        [value]="value() ?? ''"
        [disabled]="disabled()"
        [readOnly]="readOnly()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [attr.data-testid]="testId()"
        (input)="emit(input.value === '' ? null : input.value)"
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
export class DateField extends FieldWidget<string> {
  protected fromModel(value: unknown): string | null {
    return typeof value === 'string' && ISO_DATE.test(value) ? value : null;
  }
}
