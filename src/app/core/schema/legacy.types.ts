/** Schema v1: flat list of `fields`, inline label and validation, `showIf` instead of `visibleIf`. */
export type V1Field = {
  readonly name: string;
  readonly widget: string;
  readonly label?: string;
  readonly required?: boolean;
  readonly pattern?: string;
  readonly min?: number;
  readonly max?: number;
  readonly options?: readonly string[];
  readonly showIf?: string;
  readonly fields?: readonly V1Field[];
};

export type V1Config = {
  readonly version: 1;
  readonly id: string;
  readonly title: string;
  readonly fields: readonly V1Field[];
};

/** Schema v2: tree with `props`, but short widget names and validation inside `props`. */
export type V2Node = {
  readonly id: string;
  readonly type: string;
  readonly props?: Readonly<Record<string, unknown>>;
  readonly children?: readonly V2Node[];
  readonly visibleIf?: string;
  readonly requiredIf?: string;
  readonly computed?: string;
};

export type V2Config = {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly title: string;
  readonly root: V2Node;
};
