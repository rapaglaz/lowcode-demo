import { Component, computed, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldControlDirective } from '../renderer/field-control.directive';
import { FieldLabel } from './field-label';
import { FieldMessages } from './field-messages';
import { FieldWidget } from './field-widget';

@Component({
  selector: 'mm-textarea-field',
  imports: [FieldLabel, FieldMessages],
  hostDirectives: [FieldControlDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TextareaField), multi: true },
  ],
  template: `
    <div class="field">
      <mm-field-label [for]="inputId()" [text]="label()" [required]="required()" />
      <textarea
        #input
        [id]="inputId()"
        [rows]="rows()"
        [value]="value() ?? ''"
        [disabled]="disabled()"
        [readOnly]="readOnly()"
        [attr.placeholder]="placeholder()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [attr.data-testid]="testId()"
        (input)="emit(input.value === '' ? null : input.value)"
        (blur)="touch()"
      ></textarea>
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
export class TextareaField extends FieldWidget<string> {
  protected readonly rows = computed(() => this.node().props?.rows ?? 4);

  protected fromModel(value: unknown): string | null {
    return value === null || value === undefined ? null : String(value);
  }
}
