import { JsonPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import {
  form,
  FormField,
  FormRoot,
  max,
  min,
  pattern,
  required,
  ValidationError,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';

type InstalmentModel = {
  customerNumber: string;
  currentInstalment: number;
  newInstalment: number | null;
  reason: string;
};

const INITIAL: InstalmentModel = {
  customerNumber: '',
  currentInstalment: 85,
  newInstalment: null,
  reason: '',
};

/** Same rule as `abschlag.json`, but as plain TypeScript instead of an expression string. */
const differenceOf = (model: InstalmentModel): number | null =>
  model.newInstalment === null ? null : model.newInstalment - model.currentInstalment;

/**
 * The "Abschlag ändern" screen written by hand with Signal Forms, for comparison
 * with the metadata-driven Reactive Forms path. The model is a plain signal;
 * validation is a schema function; `requiredIf` becomes `required(..., { when })`.
 */
@Component({
  selector: 'mm-signal-forms-page',
  imports: [FormField, FormRoot, JsonPipe, RouterLink],
  templateUrl: './signal-forms-page.html',
  styleUrl: './signal-forms-page.scss',
})
export class SignalFormsPage {
  protected readonly model = signal<InstalmentModel>({ ...INITIAL });
  protected readonly saved = signal<InstalmentModel | null>(null);

  protected readonly difference = computed(() => differenceOf(this.model()));

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.customerNumber, { message: 'Bitte füllen Sie dieses Feld aus.' });
      pattern(path.customerNumber, /^[0-9]{8}$/, {
        message: 'Die Kundennummer besteht aus acht Ziffern.',
      });
      required(path.newInstalment, { message: 'Bitte füllen Sie dieses Feld aus.' });
      min(path.newInstalment, 10, { message: 'Der Wert muss mindestens 10 sein.' });
      max(path.newInstalment, 1000, { message: 'Der Wert darf höchstens 1000 sein.' });
      // Reactive rule: re-evaluated automatically whenever the referenced values change.
      required(path.reason, {
        message: 'Bitte füllen Sie dieses Feld aus.',
        when: ({ valueOf }) => {
          const next = valueOf(path.newInstalment);
          return next !== null && next - valueOf(path.currentInstalment) > 50;
        },
      });
    },
    {
      submission: {
        // Runs only for a valid form; `<form [formRoot]>` marks all fields touched first.
        action: async () => {
          this.saved.set(structuredClone(this.model()));
          return undefined;
        },
      },
    },
  );

  protected messages(errors: readonly ValidationError[]): string[] {
    return errors.map((error) => error.message ?? error.kind);
  }

  protected reset(): void {
    this.model.set({ ...INITIAL });
    this.form().reset();
    this.saved.set(null);
  }
}
