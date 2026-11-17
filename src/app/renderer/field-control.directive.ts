import { Directive, effect, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NODE_CONTEXT } from './node-context';

/**
 * Adapter between a FormControl and the widget's ControlValueAccessor.
 * `FormControlDirective` cannot be used as a host directive (it is not standalone),
 * and a dynamic component cannot get `[formControl]` from a template, so this
 * directive does the same wiring as Angular's internal `setUpControl`.
 */
@Directive({ selector: '[mmFieldControl]' })
export class FieldControlDirective {
  private readonly context = inject(NODE_CONTEXT, { optional: true });
  private readonly accessor = inject(NG_VALUE_ACCESSOR, { self: true })[0];

  constructor() {
    effect((onCleanup) => {
      const control = this.context?.control();
      if (control instanceof FormControl) {
        onCleanup(bindControl(control, this.accessor));
      }
    });
  }
}

/** Wires both directions and returns a function that deactivates the binding. */
export function bindControl(control: FormControl, accessor: ControlValueAccessor): () => void {
  // FormControl has no public API to unregister callbacks, so a flag disarms them.
  let active = true;

  accessor.writeValue(control.value);
  accessor.setDisabledState?.(control.disabled);

  // View -> model
  accessor.registerOnChange((value: unknown) => {
    if (!active) return;
    control.markAsDirty();
    control.setValue(value, { emitModelToViewChange: false });
  });
  accessor.registerOnTouched(() => {
    if (active) control.markAsTouched();
  });

  // Model -> view
  control.registerOnChange((value: unknown, emitModelEvent?: boolean) => {
    if (active && emitModelEvent !== false) accessor.writeValue(value);
  });
  control.registerOnDisabledChange((disabled: boolean) => {
    if (active) accessor.setDisabledState?.(disabled);
  });

  return () => {
    active = false;
  };
}
