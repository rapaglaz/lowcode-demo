import { tokenize } from './tokenizer';

describe('tokenize', () => {
  it('produces typed tokens with positions', () => {
    const result = tokenize("a.b >= 10.5 && name != 'x'");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.type)).toEqual([
      'identifier',
      'operator',
      'number',
      'operator',
      'identifier',
      'operator',
      'string',
      'eof',
    ]);
    expect(result.value[2]).toEqual({ type: 'number', value: 10.5, pos: 7 });
  });

  it.each([
    ['a # b', "Unknown character '#' at position 2"],
    ["'open", 'Unterminated string starting at position 0'],
    ['a..b', "Invalid identifier 'a..b' at position 0"],
    ['a = b', "Unknown character '=' at position 2"],
  ])('rejects %j', (source, message) => {
    expect(tokenize(source)).toEqual({ ok: false, error: message });
  });
});
