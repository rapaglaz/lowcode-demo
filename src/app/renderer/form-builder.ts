import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Primitive, UiNode } from '../core/config.types';

/**
 * Dynamic forms cannot use typed controls: the shape is only known at runtime.
 * The config validator is the place where that shape is guaranteed.
 */
export type DynamicGroup = FormGroup<Record<string, AbstractControl>>;
export type DynamicArray = FormArray<DynamicGroup>;

/** Maps the static `validators` block of a node to Angular validator functions. */
export function validatorsFor(node: UiNode): ValidatorFn[] {
  const config = node.validators ?? {};
  const validators: ValidatorFn[] = [];
  if (config.required) validators.push(Validators.required);
  if (config.min !== undefined) validators.push(Validators.min(config.min));
  if (config.max !== undefined) validators.push(Validators.max(config.max));
  if (config.pattern !== undefined) validators.push(Validators.pattern(config.pattern));
  return validators;
}

/**
 * Builds the control tree for a node (Composite -> Composite):
 * section -> FormGroup, repeat-list -> FormArray of item groups, everything else -> FormControl.
 */
export function buildControl(node: UiNode): AbstractControl {
  switch (node.type) {
    case 'section':
      return buildGroup(node.children ?? []);
    case 'repeat-list': {
      const initialItems = Math.max(node.props?.minItems ?? 1, 0);
      return new FormArray(Array.from({ length: initialItems }, () => createListItem(node)));
    }
    default:
      return new FormControl<Primitive>(node.props?.defaultValue ?? null, validatorsFor(node));
  }
}

function buildGroup(children: readonly UiNode[]): DynamicGroup {
  const controls: Record<string, AbstractControl> = {};
  for (const child of children) controls[child.id] = buildControl(child);
  return new FormGroup(controls);
}

/** Creates one item of a repeat-list; the list's children are the item template. */
export function createListItem(listNode: UiNode): DynamicGroup {
  return buildGroup(listNode.children ?? []);
}

/** The root node is always a section, so the form itself is a FormGroup. */
export function buildForm(root: UiNode): DynamicGroup {
  return buildGroup(root.children ?? []);
}
