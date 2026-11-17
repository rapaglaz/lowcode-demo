import { InjectionToken, Signal } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { NodeRuleState } from './rule-engine';

/**
 * Per-node data that widgets read from DI instead of inputs. All members are signals,
 * so that the injector built for a node can stay the same for its whole lifetime:
 * `NgComponentOutlet` would recreate the component if the injector changed.
 */
export type NodeContext = {
  /** Concrete control path, e.g. `contacts.1.channel`; `''` for the screen root. */
  readonly path: Signal<string>;
  readonly readOnly: Signal<boolean>;
  /** FormControl for fields, FormGroup for sections and list items, FormArray for lists. */
  readonly control: Signal<AbstractControl | null>;
  readonly state: Signal<NodeRuleState>;
};

export const NODE_CONTEXT = new InjectionToken<NodeContext>('NODE_CONTEXT');

export const DEFAULT_RULE_STATE: NodeRuleState = { visible: true, required: false, errors: [] };

/** DOM-safe id fragment derived from a control path (`contacts.1.channel` -> `contacts-1-channel`). */
export const domId = (path: string): string => (path === '' ? 'root' : path.replaceAll('.', '-'));
