import {
  CURRENT_SCHEMA_VERSION,
  NodeProps,
  ScreenConfig,
  UiNode,
  ValidatorConfig,
} from '../config.types';
import { V1Config, V1Field, V2Config, V2Node } from './legacy.types';
import { transformTree } from './tree-visitor';

/** v1 -> v2: build a tree under a root section and move inline settings into `props`. */
export function migrateV1ToV2(config: V1Config): V2Config {
  const toNode = (field: V1Field, children: V2Node[] | undefined): V2Node => {
    const { name, widget, showIf, fields: _fields, options, ...inline } = field;
    const props: Record<string, unknown> = { ...inline };
    if (options) props['options'] = options.map((o) => ({ value: o, label: o }));
    return {
      id: name,
      type: widget,
      ...(Object.keys(props).length > 0 ? { props } : {}),
      ...(children ? { children } : {}),
      ...(showIf !== undefined ? { visibleIf: showIf } : {}),
    };
  };

  return {
    schemaVersion: 2,
    id: config.id,
    title: config.title,
    root: {
      id: 'root',
      type: 'section',
      children: config.fields.map((field) =>
        transformTree<V1Field, V2Node>(field, { children: (f) => f.fields, visit: toNode }),
      ),
    },
  };
}

/** Widget names were made explicit in v3 so that they match the registry keys. */
export const V2_TYPE_RENAMES: Readonly<Record<string, string>> = {
  text: 'text-field',
  number: 'number-field',
  select: 'select-field',
  date: 'date-field',
  upload: 'upload-field',
  textarea: 'textarea-field',
  list: 'repeat-list',
};

const VALIDATOR_KEYS = ['required', 'min', 'max', 'pattern'] as const;

/** v2 -> v3: rename widget types and move validation rules from `props` to `validators`. */
export function migrateV2ToV3(config: V2Config): ScreenConfig {
  const toNode = (node: V2Node, children: UiNode[] | undefined): UiNode => {
    const props: Record<string, unknown> = { ...node.props };
    const validators: Record<string, unknown> = {};
    for (const key of VALIDATOR_KEYS) {
      if (key in props) {
        validators[key] = props[key];
        delete props[key];
      }
    }
    return {
      ...node,
      type: V2_TYPE_RENAMES[node.type] ?? node.type,
      props: props as NodeProps,
      ...(Object.keys(validators).length > 0 ? { validators: validators as ValidatorConfig } : {}),
      ...(children ? { children } : {}),
    };
  };

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: config.id,
    title: config.title,
    root: transformTree<V2Node, UiNode>(config.root, {
      children: (n) => n.children,
      visit: toNode,
    }),
  };
}

/** Reads the version marker; v1 used `version`, later versions use `schemaVersion`. */
export function detectSchemaVersion(raw: unknown): number | null {
  if (raw === null || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const version = record['schemaVersion'] ?? record['version'];
  return typeof version === 'number' && Number.isInteger(version) ? version : null;
}

/**
 * Runs all migrations from the detected version up to the current one.
 * Each step is a pure function, so the chain is easy to test in isolation.
 * The result is still unvalidated: the caller must run the validator.
 */
export function migrateToCurrent(raw: unknown, fromVersion: number): unknown {
  let current: unknown = raw;
  if (fromVersion <= 1) current = migrateV1ToV2(current as V1Config);
  if (fromVersion <= 2) current = migrateV2ToV3(current as V2Config);
  return current;
}
