import { ValidationErrors } from '@angular/forms';
import { UiNode } from '../core/config.types';

/**
 * Converts Angular validation errors into user-facing text. The screens are
 * German, so the default messages are German; `props.patternMessage` overrides
 * the generic pattern text.
 */
export function errorMessages(errors: ValidationErrors | null, node: UiNode): string[] {
  if (!errors) return [];
  return Object.entries(errors).map(([key, detail]) => {
    switch (key) {
      case 'required':
        return 'Bitte füllen Sie dieses Feld aus.';
      case 'pattern':
        return node.props?.patternMessage ?? 'Das Format ist ungültig.';
      case 'min':
        return `Der Wert muss mindestens ${(detail as { min: number }).min} sein.`;
      case 'max':
        return `Der Wert darf höchstens ${(detail as { max: number }).max} sein.`;
      default:
        return 'Der Wert ist ungültig.';
    }
  });
}
