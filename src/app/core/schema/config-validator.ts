import { collectReferences, parse } from '../../expressions';
import {
  ConfigIssue,
  CURRENT_SCHEMA_VERSION,
  isContainerType,
  ScreenConfig,
  UiNode,
} from '../config.types';
import { referenceablePaths } from './value-paths';

export type ValidationResult =
  | { readonly ok: true; readonly config: ScreenConfig }
  | { readonly ok: false; readonly issues: readonly ConfigIssue[] };

type Json = Readonly<Record<string, unknown>>;

const isObject = (value: unknown): value is Json =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const NODE_KEYS = new Set([
  'id',
  'type',
  'props',
  'validators',
  'children',
  'visibleIf',
  'requiredIf',
  'computed',
]);
const EXPRESSION_KEYS = ['visibleIf', 'requiredIf', 'computed'] as const;
const STRING_PROPS = [
  'label',
  'hint',
  'placeholder',
  'accept',
  'patternMessage',
  'addLabel',
  'itemLabel',
];
const NUMBER_PROPS = ['rows', 'minItems'];

/**
 * Hand-written validator for schema v3. It collects all issues instead of
 * stopping at the first one, so that the error panel can list everything at once.
 * Pass 1 checks the structure; pass 2 (only on a sound structure) checks
 * cross-node rules: unique ids and expression references.
 */
export function validateConfig(raw: unknown): ValidationResult {
  const issues: ConfigIssue[] = [];
  const add = (path: string, message: string): void => {
    issues.push({ path, message });
  };

  if (!isObject(raw)) {
    return { ok: false, issues: [{ path: '$', message: 'Configuration must be a JSON object.' }] };
  }
  if (raw['schemaVersion'] !== CURRENT_SCHEMA_VERSION) {
    add(
      '$.schemaVersion',
      `Expected schema version ${CURRENT_SCHEMA_VERSION}, got ${String(raw['schemaVersion'])}.`,
    );
  }
  if (typeof raw['id'] !== 'string' || raw['id'].trim() === '') {
    add('$.id', 'Screen id must be a non-empty string.');
  }
  if (typeof raw['title'] !== 'string' || raw['title'].trim() === '') {
    add('$.title', 'Screen title must be a non-empty string.');
  }
  if (raw['description'] !== undefined && typeof raw['description'] !== 'string') {
    add('$.description', 'Description must be a string.');
  }

  if (!isObject(raw['root'])) {
    add('$.root', 'Root node is missing.');
  } else {
    validateNode(raw['root'], '$.root', add);
    if (raw['root']['type'] !== 'section')
      add('$.root.type', "Root node must be of type 'section'.");
  }

  if (issues.length === 0) {
    validateCrossReferences((raw as unknown as ScreenConfig).root, add);
  }

  return issues.length === 0
    ? { ok: true, config: raw as unknown as ScreenConfig }
    : { ok: false, issues };
}

function validateNode(
  node: Json,
  path: string,
  add: (path: string, message: string) => void,
): void {
  const id = node['id'];
  const type = node['type'];

  if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
    add(
      `${path}.id`,
      `Node id must start with a letter and contain only letters, digits or '_' (got ${JSON.stringify(id)}).`,
    );
  }
  if (typeof type !== 'string' || type === '') {
    add(`${path}.type`, 'Node type must be a non-empty string.');
  }
  for (const key of Object.keys(node)) {
    if (!NODE_KEYS.has(key)) add(`${path}.${key}`, `Unknown node property '${key}'.`);
  }

  validateProps(node['props'], type, `${path}.props`, add);
  validateValidators(node['validators'], `${path}.validators`, add);

  for (const key of EXPRESSION_KEYS) {
    const source = node[key];
    if (source === undefined) continue;
    if (typeof source !== 'string') {
      add(`${path}.${key}`, `'${key}' must be an expression string.`);
      continue;
    }
    const ast = parse(source);
    if (!ast.ok) add(`${path}.${key}`, `Invalid expression "${source}": ${ast.error}.`);
  }

  if (
    node['requiredIf'] !== undefined &&
    isObject(node['validators']) &&
    node['validators']['required'] === true
  ) {
    add(`${path}.requiredIf`, "Use either 'validators.required' or 'requiredIf', not both.");
  }

  const children = node['children'];
  if (children !== undefined && !Array.isArray(children)) {
    add(`${path}.children`, 'Children must be an array.');
    return;
  }
  if (typeof type === 'string' && isContainerType(type) && (!children || children.length === 0)) {
    add(`${path}.children`, `A '${type}' needs at least one child.`);
  }
  if (typeof type === 'string' && isContainerType(type) && node['computed'] !== undefined) {
    add(`${path}.computed`, `A '${type}' cannot have a computed value.`);
  }
  (children ?? []).forEach((child: unknown, index: number) => {
    const childPathLabel = `${path}.children[${index}]`;
    if (isObject(child)) validateNode(child, childPathLabel, add);
    else add(childPathLabel, 'Child must be a node object.');
  });
}

function validateProps(
  props: unknown,
  type: unknown,
  path: string,
  add: (path: string, message: string) => void,
): void {
  if (props === undefined) {
    if (type === 'select-field') add(`${path}.options`, 'A select field needs options.');
    return;
  }
  if (!isObject(props)) {
    add(path, 'Props must be an object.');
    return;
  }
  for (const key of STRING_PROPS) {
    if (props[key] !== undefined && typeof props[key] !== 'string')
      add(`${path}.${key}`, `'${key}' must be a string.`);
  }
  for (const key of NUMBER_PROPS) {
    if (props[key] !== undefined && typeof props[key] !== 'number')
      add(`${path}.${key}`, `'${key}' must be a number.`);
  }
  if (props['readOnly'] !== undefined && typeof props['readOnly'] !== 'boolean') {
    add(`${path}.readOnly`, "'readOnly' must be a boolean.");
  }
  const defaultValue = props['defaultValue'];
  if (
    defaultValue !== undefined &&
    defaultValue !== null &&
    !['string', 'number', 'boolean'].includes(typeof defaultValue)
  ) {
    add(`${path}.defaultValue`, "'defaultValue' must be a string, number, boolean or null.");
  }

  const options = props['options'];
  if (type === 'select-field' && options === undefined) {
    add(`${path}.options`, 'A select field needs options.');
  }
  if (options !== undefined) {
    if (!Array.isArray(options) || options.length === 0) {
      add(`${path}.options`, 'Options must be a non-empty array.');
    } else {
      options.forEach((option: unknown, index: number) => {
        if (
          !isObject(option) ||
          typeof option['value'] !== 'string' ||
          typeof option['label'] !== 'string'
        ) {
          add(`${path}.options[${index}]`, "Each option needs a string 'value' and 'label'.");
        }
      });
    }
  }
}

function validateValidators(
  validators: unknown,
  path: string,
  add: (path: string, message: string) => void,
): void {
  if (validators === undefined) return;
  if (!isObject(validators)) {
    add(path, 'Validators must be an object.');
    return;
  }
  for (const key of Object.keys(validators)) {
    if (!['required', 'min', 'max', 'pattern'].includes(key))
      add(`${path}.${key}`, `Unknown validator '${key}'.`);
  }
  if (validators['required'] !== undefined && typeof validators['required'] !== 'boolean') {
    add(`${path}.required`, "'required' must be a boolean.");
  }
  for (const key of ['min', 'max']) {
    if (validators[key] !== undefined && typeof validators[key] !== 'number')
      add(`${path}.${key}`, `'${key}' must be a number.`);
  }
  const { min, max } = validators;
  if (typeof min === 'number' && typeof max === 'number' && min > max) {
    add(path, `'min' (${min}) must not be greater than 'max' (${max}).`);
  }
  const pattern = validators['pattern'];
  if (pattern !== undefined) {
    if (typeof pattern !== 'string') {
      add(`${path}.pattern`, "'pattern' must be a string.");
    } else {
      // The RegExp constructor only compiles a pattern; it does not execute code.
      try {
        new RegExp(pattern);
      } catch {
        add(`${path}.pattern`, `'${pattern}' is not a valid regular expression.`);
      }
    }
  }
}

/** Pass 2: ids must be unique in the whole tree and expressions may only reference known fields. */
function validateCrossReferences(root: UiNode, add: (path: string, message: string) => void): void {
  const { global, perList } = referenceablePaths(root);
  const seen = new Set<string>();

  const visit = (node: UiNode, path: string, listId: string | null): void => {
    if (seen.has(node.id)) add(`${path}.id`, `Duplicate node id '${node.id}'.`);
    seen.add(node.id);

    const allowed = listId === null ? global : new Set([...global, ...(perList.get(listId) ?? [])]);
    for (const key of EXPRESSION_KEYS) {
      const source = node[key];
      if (source === undefined) continue;
      const ast = parse(source);
      if (!ast.ok) continue;
      for (const ref of collectReferences(ast.value)) {
        if (!allowed.has(ref)) {
          add(`${path}.${key}`, `Expression "${source}" references unknown field '${ref}'.`);
        }
      }
    }

    const childListId = node.type === 'repeat-list' ? node.id : listId;
    node.children?.forEach((child, index) =>
      visit(child, `${path}.children[${index}]`, childListId),
    );
  };

  visit(root, '$.root', null);
}
