import { V1Config, V2Config } from './legacy.types';
import { detectSchemaVersion, migrateToCurrent, migrateV1ToV2, migrateV2ToV3 } from './migrations';
import { validateConfig } from './config-validator';
import { loadConfig } from './load-config';

const v1: V1Config = {
  version: 1,
  id: 'legacy',
  title: 'Legacy',
  fields: [
    { name: 'meter', widget: 'text', label: 'Meter', required: true, pattern: '^[0-9]+$' },
    { name: 'kind', widget: 'select', label: 'Kind', options: ['A', 'B'] },
    {
      name: 'details',
      widget: 'section',
      label: 'Details',
      showIf: "kind == 'B'",
      fields: [{ name: 'value', widget: 'number', label: 'Value', min: 0 }],
    },
  ],
};

describe('migrations', () => {
  it('v1 -> v2 builds a root section, moves inline settings into props and renames showIf', () => {
    const v2 = migrateV1ToV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.root.id).toBe('root');
    expect(v2.root.children?.[0]).toEqual({
      id: 'meter',
      type: 'text',
      props: { label: 'Meter', required: true, pattern: '^[0-9]+$' },
    });
    expect(v2.root.children?.[1].props?.['options']).toEqual([
      { value: 'A', label: 'A' },
      { value: 'B', label: 'B' },
    ]);
    expect(v2.root.children?.[2].visibleIf).toBe("kind == 'B'");
    expect(v2.root.children?.[2].children?.[0].id).toBe('value');
  });

  it('v2 -> v3 renames widget types and extracts validators', () => {
    const v2: V2Config = {
      schemaVersion: 2,
      id: 'x',
      title: 'X',
      root: {
        id: 'root',
        type: 'section',
        children: [
          { id: 'a', type: 'number', props: { label: 'A', min: 1, max: 5 } },
          { id: 'b', type: 'custom-widget', props: { label: 'B' } },
        ],
      },
    };
    const v3 = migrateV2ToV3(v2);
    expect(v3.schemaVersion).toBe(3);
    expect(v3.root.children?.[0]).toEqual({
      id: 'a',
      type: 'number-field',
      props: { label: 'A' },
      validators: { min: 1, max: 5 },
    });
    // Unknown types pass through unchanged so that the fallback widget can show them.
    expect(v3.root.children?.[1].type).toBe('custom-widget');
  });

  it('does not mutate its input', () => {
    const snapshot = structuredClone(v1);
    migrateV2ToV3(migrateV1ToV2(v1));
    expect(v1).toEqual(snapshot);
  });

  it('the full chain produces a valid v3 config', () => {
    const result = validateConfig(migrateToCurrent(v1, 1));
    expect(result.ok).toBe(true);
  });

  it.each([
    [{ version: 1 }, 1],
    [{ schemaVersion: 3 }, 3],
    [{ schemaVersion: '3' }, null],
    [null, null],
    [[], null],
  ])('detects version of %j as %j', (raw, expected) => {
    expect(detectSchemaVersion(raw)).toBe(expected);
  });
});

describe('loadConfig', () => {
  it('reports the source version of a migrated config', () => {
    const result = loadConfig(v1);
    expect(result.ok && result.migratedFrom).toBe(1);
  });

  it('turns a broken legacy file into an issue instead of throwing', () => {
    const result = loadConfig({ version: 1, id: 'x', title: 'X', fields: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues[0].message).toMatch(/^Migration from version 1 failed/);
  });

  it('rejects unsupported versions', () => {
    expect(loadConfig({ schemaVersion: 9 })).toEqual({
      ok: false,
      issues: [{ path: '$.schemaVersion', message: 'Unsupported schema version 9.' }],
    });
  });
});
