/**
 * Current configuration model (schema version 3).
 * Older versions are converted on load, see `schema/migrations.ts`.
 */
export const CURRENT_SCHEMA_VERSION = 3;

/** Node types that hold other nodes. All other types are leaf fields with a form control. */
export const CONTAINER_TYPES = ['section', 'repeat-list'] as const;
export type ContainerType = (typeof CONTAINER_TYPES)[number];

export const isContainerType = (type: string): type is ContainerType =>
  (CONTAINER_TYPES as readonly string[]).includes(type);

/** Field types that ship with the app. The registry may add more at runtime. */
export const FIELD_TYPES = [
  'text-field',
  'number-field',
  'select-field',
  'date-field',
  'upload-field',
  'textarea-field',
] as const;

export type Primitive = string | number | boolean | null;

export type SelectOption = { readonly value: string; readonly label: string };

/**
 * Display and behaviour settings of a node. Known keys are typed; the index
 * signature allows widgets registered by third parties to read their own props.
 */
export type NodeProps = {
  readonly label?: string;
  readonly hint?: string;
  readonly placeholder?: string;
  readonly readOnly?: boolean;
  readonly defaultValue?: Primitive;
  readonly options?: readonly SelectOption[];
  readonly rows?: number;
  readonly accept?: string;
  readonly patternMessage?: string;
  readonly addLabel?: string;
  readonly itemLabel?: string;
  readonly minItems?: number;
} & Readonly<Record<string, unknown>>;

/** Static validation rules; they map 1:1 to Angular validators. */
export type ValidatorConfig = {
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly pattern?: string;
};

/**
 * One node of the screen tree (Composite pattern: sections and lists contain nodes,
 * fields are leaves). Expressions refer to values by absolute dotted path
 * (`complaint.priority`); inside a repeat-list, `item.<id>` refers to the current item.
 */
export type UiNode = {
  readonly id: string;
  readonly type: string;
  readonly props?: NodeProps;
  readonly validators?: ValidatorConfig;
  readonly children?: readonly UiNode[];
  /** Expression; the node is hidden and its control disabled while it is false. */
  readonly visibleIf?: string;
  /** Expression; adds `Validators.required` while it is true. */
  readonly requiredIf?: string;
  /** Expression; its result is written into the control, the field is read-only. */
  readonly computed?: string;
};

export type ScreenConfig = {
  readonly schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly root: UiNode;
};

/** One readable problem found during validation or migration. */
export type ConfigIssue = { readonly path: string; readonly message: string };

export type ConfigLoadResult =
  | { readonly ok: true; readonly config: ScreenConfig; readonly migratedFrom: number | null }
  | { readonly ok: false; readonly issues: readonly ConfigIssue[] };
