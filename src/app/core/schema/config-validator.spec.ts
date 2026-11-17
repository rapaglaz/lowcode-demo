import { ScreenConfig, UiNode } from '../config.types';
import { validateConfig } from './config-validator';

const screen = (...children: unknown[]): unknown => ({
  schemaVersion: 3,
  id: 'test',
  title: 'Test',
  root: { id: 'root', type: 'section', children },
});

const text = (id: string, extra: Partial<UiNode> = {}): UiNode => ({
  id,
  type: 'text-field',
  props: { label: id },
  ...extra,
});

const messages = (raw: unknown): string[] => {
  const result = validateConfig(raw);
  return result.ok ? [] : result.issues.map((i) => `${i.path}: ${i.message}`);
};

describe('validateConfig', () => {
  it('accepts a valid config and returns it typed', () => {
    const raw = screen(
      text('a', { validators: { required: true, pattern: '^x$' } }),
      {
        id: 'list',
        type: 'repeat-list',
        children: [text('b', { visibleIf: "item.b != 'x' && a == 'y'" })],
      },
      {
        id: 's',
        type: 'section',
        visibleIf: 'a != null',
        children: [
          { id: 'n', type: 'number-field', computed: 's.c + 1' },
          { id: 'c', type: 'number-field' },
        ],
      },
    );
    const result = validateConfig(raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect((result.config as ScreenConfig).root.children?.length).toBe(3);
  });

  it('accepts unknown widget types, the renderer shows a fallback for them', () => {
    expect(messages(screen({ id: 'x', type: 'signature-pad' }))).toEqual([]);
  });

  it.each<[string, unknown, string[]]>([
    ['non-object', 'text', ['$: Configuration must be a JSON object.']],
    [
      'missing header fields',
      { schemaVersion: 2, root: { id: 'root', type: 'section', children: [text('a')] } },
      [
        '$.schemaVersion: Expected schema version 3, got 2.',
        '$.id: Screen id must be a non-empty string.',
        '$.title: Screen title must be a non-empty string.',
      ],
    ],
    ['missing root', { schemaVersion: 3, id: 'a', title: 'A' }, ['$.root: Root node is missing.']],
    [
      'invalid id',
      screen(text('1abc')),
      [
        `$.root.children[0].id: Node id must start with a letter and contain only letters, digits or '_' (got "1abc").`,
      ],
    ],
    [
      'unknown key',
      screen({ ...text('a'), label: 'x' }),
      ["$.root.children[0].label: Unknown node property 'label'."],
    ],
    [
      'select without options',
      screen({ id: 's', type: 'select-field' }),
      ['$.root.children[0].props.options: A select field needs options.'],
    ],
    [
      'bad option',
      screen({ id: 's', type: 'select-field', props: { options: [{ value: 1 }] } }),
      ["$.root.children[0].props.options[0]: Each option needs a string 'value' and 'label'."],
    ],
    [
      'bad validators',
      screen(text('a', { validators: { min: 5, max: 1, pattern: '(' } })),
      [
        "$.root.children[0].validators: 'min' (5) must not be greater than 'max' (1).",
        "$.root.children[0].validators.pattern: '(' is not a valid regular expression.",
      ],
    ],
    [
      'unknown validator',
      screen(text('a', { validators: { email: true } as never })),
      ["$.root.children[0].validators.email: Unknown validator 'email'."],
    ],
    [
      'invalid expression',
      screen(text('a', { visibleIf: 'a ==' })),
      ['$.root.children[0].visibleIf: Invalid expression "a ==": Unexpected end of expression.'],
    ],
    [
      'required twice',
      screen(text('a', { validators: { required: true }, requiredIf: 'true' })),
      [
        "$.root.children[0].requiredIf: Use either 'validators.required' or 'requiredIf', not both.",
      ],
    ],
    [
      'empty section',
      screen({ id: 's', type: 'section', children: [] }),
      ["$.root.children[0].children: A 'section' needs at least one child."],
    ],
    [
      'root type',
      { schemaVersion: 3, id: 'a', title: 'A', root: text('root') },
      ["$.root.type: Root node must be of type 'section'."],
    ],
    [
      'duplicate ids',
      screen(text('a'), text('a')),
      ["$.root.children[1].id: Duplicate node id 'a'."],
    ],
    [
      'unknown reference',
      screen(text('a', { visibleIf: "missing == 'x'" })),
      [
        `$.root.children[0].visibleIf: Expression "missing == 'x'" references unknown field 'missing'.`,
      ],
    ],
    [
      'item reference outside a list',
      screen(text('a', { visibleIf: 'item.a == 1' })),
      [`$.root.children[0].visibleIf: Expression "item.a == 1" references unknown field 'item.a'.`],
    ],
    [
      'section path required for nested fields',
      screen(text('a', { visibleIf: 'b == 1' }), {
        id: 's',
        type: 'section',
        children: [text('b')],
      }),
      [`$.root.children[0].visibleIf: Expression "b == 1" references unknown field 'b'.`],
    ],
  ])('reports %s', (_label, raw, expected) => {
    expect(messages(raw)).toEqual(expected);
  });
});
