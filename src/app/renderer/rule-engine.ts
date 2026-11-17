import { AbstractControl, FormArray, FormGroup, Validators } from '@angular/forms';
import { Primitive, UiNode } from '../core/config.types';
import { childPath, ITEM_SCOPE, ROOT_PATH } from '../core/schema/value-paths';
import { asCondition, evaluate, parse, Scope, Value } from '../expressions';

/** Result of all expressions for one concrete node instance. */
export type NodeRuleState = {
  readonly visible: boolean;
  readonly required: boolean;
  /** Present only for nodes with a `computed` expression. */
  readonly computedValue?: Primitive;
  /** Evaluation problems, e.g. arithmetic on an empty field. They never stop rendering. */
  readonly errors: readonly string[];
};

/**
 * Rule state per concrete control path. Items of a repeat-list get one entry per
 * item (`contacts.0.channel`, `contacts.1.channel`). Insertion order is pre-order,
 * so parents are always applied before their children.
 */
export type RuleSnapshot = ReadonlyMap<string, NodeRuleState>;

type MutableRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is MutableRecord =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Parsing is pure and configs are immutable, so the AST can be cached per source string. */
const astCache = new Map<string, ReturnType<typeof parse>>();
function run(source: string, scope: Scope) {
  let ast = astCache.get(source);
  if (!ast) {
    ast = parse(source);
    astCache.set(source, ast);
  }
  return ast.ok ? evaluate(ast.value, scope) : ast;
}

/**
 * Evaluates `visibleIf`, `requiredIf` and `computed` for the whole tree.
 * Pure function of (config, value): it is meant to run inside `computed()`.
 * Computed results are written into a private copy of the scope, so that
 * later expressions (e.g. `difference > 50`) already see the new value.
 */
export function evaluateRules(root: UiNode, rawValue: unknown): RuleSnapshot {
  const snapshot = new Map<string, NodeRuleState>();
  const rootScope: MutableRecord = isRecord(rawValue) ? structuredClone(rawValue) : {};

  /**
   * @param controlPath concrete path in the form (`contacts.0.result`)
   * @param container   object in the scope that holds this node's value
   * @param scope       what expressions see (root fields plus `item` inside lists)
   */
  const visit = (
    node: UiNode,
    controlPath: string,
    container: MutableRecord,
    scope: Scope,
    parentVisible: boolean,
  ): void => {
    const errors: string[] = [];
    const condition = (key: 'visibleIf' | 'requiredIf', fallback: boolean): boolean => {
      const source = node[key];
      if (source === undefined) return fallback;
      const result = run(source, scope);
      if (!result.ok) errors.push(`${key}: ${result.error}`);
      return asCondition(result);
    };

    const visible = parentVisible && condition('visibleIf', true);
    const required =
      visible && (node.validators?.required === true || condition('requiredIf', false));

    let computedValue: Value | undefined;
    if (node.computed !== undefined) {
      const result = run(node.computed, scope);
      if (!result.ok) errors.push(`computed: ${result.error}`);
      // A failed computation (e.g. an empty operand) clears the field instead of showing stale data.
      computedValue = result.ok ? result.value : null;
      container[node.id] = computedValue;
    }

    if (controlPath !== ROOT_PATH) {
      snapshot.set(controlPath, {
        visible,
        required,
        ...(computedValue !== undefined ? { computedValue } : {}),
        errors,
      });
    }

    if (node.type === 'section') {
      const group = controlPath === ROOT_PATH ? container : container[node.id];
      if (!isRecord(group)) return;
      for (const child of node.children ?? []) {
        visit(child, childPath(controlPath, child.id), group, scope, visible);
      }
    } else if (node.type === 'repeat-list') {
      const items = container[node.id];
      if (!Array.isArray(items)) return;
      items.forEach((item: unknown, index) => {
        if (!isRecord(item)) return;
        const itemScope: Scope = { ...scope, [ITEM_SCOPE]: item };
        const itemPath = `${controlPath}.${index}`;
        for (const child of node.children ?? []) {
          visit(child, childPath(itemPath, child.id), item, itemScope, visible);
        }
      });
    }
  };

  visit(root, ROOT_PATH, rootScope, rootScope, true);
  return snapshot;
}

/**
 * Applies a snapshot to the form. Idempotent: it only touches controls whose
 * state differs, so the `valueChanges` it triggers lead to a stable fixpoint.
 */
export function applyRules(form: FormGroup, root: UiNode, snapshot: RuleSnapshot): void {
  const dynamicRequired = collectRequiredIfIds(root);

  for (const [path, state] of snapshot) {
    const control = form.get(path);
    if (!control) continue;

    // Hidden controls are disabled, so that their validators do not block submission.
    if (!state.visible && control.enabled) control.disable();
    else if (state.visible && control.disabled && !isDisabledByParent(control)) control.enable();

    const id = path.slice(path.lastIndexOf('.') + 1);
    if (dynamicRequired.has(id)) {
      const hasRequired = control.hasValidator(Validators.required);
      if (state.required && !hasRequired) {
        control.addValidators(Validators.required);
        control.updateValueAndValidity();
      } else if (!state.required && hasRequired) {
        control.removeValidators(Validators.required);
        control.updateValueAndValidity();
      }
    }

    if (state.computedValue !== undefined && control.value !== state.computedValue) {
      control.setValue(state.computedValue);
    }
  }
}

function isDisabledByParent(control: AbstractControl): boolean {
  const parent = control.parent;
  return parent instanceof FormGroup || parent instanceof FormArray ? parent.disabled : false;
}

function collectRequiredIfIds(root: UiNode): Set<string> {
  const ids = new Set<string>();
  const visit = (node: UiNode): void => {
    if (node.requiredIf !== undefined) ids.add(node.id);
    node.children?.forEach(visit);
  };
  visit(root);
  return ids;
}
