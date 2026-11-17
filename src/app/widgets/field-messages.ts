import { Component, input } from '@angular/core';

/** Hint and error block below a field; ids match the field's `aria-describedby`. */
@Component({
  selector: 'mm-field-messages',
  template: `
    @if (hint(); as text) {
      <p class="field-hint" [id]="hintId()">{{ text }}</p>
    }
    @if (errors().length > 0) {
      <div class="field-error" [id]="errorId()" [attr.data-testid]="'error-' + baseId()">
        @for (message of errors(); track message) {
          <p class="field-error">{{ message }}</p>
        }
      </div>
    }
  `,
})
export class FieldMessages {
  readonly baseId = input.required<string>();
  readonly hintId = input.required<string>();
  readonly errorId = input.required<string>();
  readonly hint = input<string | null>(null);
  readonly errors = input<readonly string[]>([]);
}
