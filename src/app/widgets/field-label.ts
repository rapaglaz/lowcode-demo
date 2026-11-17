import { Component, input } from '@angular/core';

/** Label with the required marker; the marker is decorative because the input has `aria-required`. */
@Component({
  selector: 'mm-field-label',
  host: { style: 'display: contents' },
  template: `
    <label [for]="for()"
      >{{ text() }}
      @if (required()) {
        <span class="required-marker" aria-hidden="true">*</span>
      }
    </label>
  `,
})
export class FieldLabel {
  readonly for = input.required<string>();
  readonly text = input.required<string>();
  readonly required = input(false);
}
