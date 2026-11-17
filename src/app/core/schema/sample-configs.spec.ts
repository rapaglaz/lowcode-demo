import abschlag from '../../../../public/configs/abschlag.json';
import beschwerde from '../../../../public/configs/beschwerde.json';
import kaputt from '../../../../public/configs/kaputt.json';
import zaehlerstand from '../../../../public/configs/zaehlerstand.json';
import { loadConfig } from './load-config';

describe('shipped sample configs', () => {
  it.each([
    ['zaehlerstand', zaehlerstand, 1],
    ['abschlag', abschlag, null],
    ['beschwerde', beschwerde, null],
  ])('%s loads (migrated from %j)', (_id, raw, migratedFrom) => {
    const result = loadConfig(raw);
    expect(result.ok ? [] : result.issues).toEqual([]);
    expect(result.ok && result.migratedFrom).toBe(migratedFrom);
  });

  it('migrates the v1 meter screen into v3 widget types and validators', () => {
    const result = loadConfig(zaehlerstand);
    if (!result.ok) throw new Error('expected a valid config');
    const photo = result.config.root.children?.find((n) => n.id === 'photo');
    expect(photo).toMatchObject({
      type: 'upload-field',
      visibleIf: "readingType == 'Monteur'",
      validators: { required: true },
    });
  });

  it('kaputt is rejected with readable issues', () => {
    const result = loadConfig(kaputt);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.issues.length).toBeGreaterThanOrEqual(3);
  });
});
