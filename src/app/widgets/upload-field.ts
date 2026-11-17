import { Component, computed, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FieldControlDirective } from '../renderer/field-control.directive';
import { FieldLabel } from './field-label';
import { FieldMessages } from './field-messages';
import { FieldWidget } from './field-widget';

/** Only metadata goes into the form value; the File itself would not serialise to JSON. */
export type UploadedFile = { readonly name: string; readonly size: number; readonly type: string };

const isUploadedFile = (value: unknown): value is UploadedFile =>
  value !== null &&
  typeof value === 'object' &&
  typeof (value as UploadedFile).name === 'string' &&
  typeof (value as UploadedFile).size === 'number';

@Component({
  selector: 'mm-upload-field',
  imports: [FieldLabel, FieldMessages],
  hostDirectives: [FieldControlDirective],
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UploadField), multi: true },
  ],
  template: `
    <div class="field">
      <mm-field-label [for]="inputId()" [text]="label()" [required]="required()" />
      <input
        #input
        type="file"
        [id]="inputId()"
        [attr.accept]="accept()"
        [disabled]="disabled() || readOnly()"
        [attr.aria-required]="required()"
        [attr.aria-invalid]="invalid()"
        [attr.aria-describedby]="describedBy()"
        [attr.data-testid]="testId()"
        (change)="onFiles(input.files)"
        (blur)="touch()"
      />
      @if (value(); as file) {
        <p class="field-hint" [attr.data-testid]="'file-' + baseId()">
          {{ file.name }} ({{ sizeLabel() }})
        </p>
      }
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
export class UploadField extends FieldWidget<UploadedFile> {
  protected readonly accept = computed(() => this.node().props?.accept ?? null);
  protected readonly sizeLabel = computed(() => {
    const size = this.value()?.size ?? 0;
    return size < 1024 ? `${size} B` : `${Math.round(size / 1024)} KB`;
  });

  protected onFiles(files: FileList | null): void {
    const file = files?.item(0);
    this.emit(file ? { name: file.name, size: file.size, type: file.type } : null);
    // A file dialog does not reliably fire blur, so selecting a file counts as a touch.
    this.touch();
  }

  protected fromModel(value: unknown): UploadedFile | null {
    return isUploadedFile(value) ? value : null;
  }
}
