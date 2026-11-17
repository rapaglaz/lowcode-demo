import { asCondition, evaluateSource, Scope } from './evaluator';

const scope: Scope = {
  a: 10,
  b: 4,
  zero: 0,
  name: 'Kunde',
  empty: '',
  flag: true,
  missing: undefined,
  nested: { value: 7 },
  list: [1, 2],
};

describe('evaluate', () => {
  it.each<[string, unknown]>([
    ['42', 42],
    ["'text'", 'text'],
    ['true', true],
    ['null', null],
    ['a + b', 14],
    ['a - b', 6],
    ['a * b', 40],
    ['a / b', 2.5],
    ['(a + b) * 2', 28],
    ['-a + 1', -9],
    ["name + '!'", 'Kunde!'],
    ['a > b', true],
    ['a >= 10', true],
    ['a < b', false],
    ['b <= 4', true],
    ["name == 'Kunde'", true],
    ["name != 'Kunde'", false],
    ['flag && a > 5', true],
    ['!flag || zero', false],
    ['!empty', true],
    ['empty == null', true],
    ['missing == null', true],
    ['nested.value * 2', 14],
    ["'a' < 'b'", true],
  ])('%s = %j', (source, expected) => {
    expect(evaluateSource(source, scope)).toEqual({ ok: true, value: expected });
  });

  it.each([
    ['unknown + 1', "Unknown identifier 'unknown'"],
    ['nested.other', "Unknown identifier 'nested.other'"],
    ['list', "Identifier 'list' is not a primitive value"],
    ['a / zero', 'Division by zero'],
    ["a + 'x'", "Operator '+' needs numbers, got number and string"],
    ['empty * 2', "Operator '*' needs numbers, got null and number"],
    ["a < 'x'", "Operator '<' cannot compare number and string"],
    ["-'x'", "Unary '-' needs a number, got string"],
    ['a +', 'Unexpected end of expression'],
  ])('%s returns error %j', (source, message) => {
    expect(evaluateSource(source, scope)).toEqual({ ok: false, error: message });
  });

  it('short-circuits so that errors on the right side are ignored', () => {
    expect(evaluateSource('false && unknown', scope)).toEqual({ ok: true, value: false });
    expect(evaluateSource('true || unknown', scope)).toEqual({ ok: true, value: true });
  });

  it('does not resolve inherited object properties', () => {
    expect(evaluateSource('toString', scope).ok).toBe(false);
  });

  it('treats errors as a false condition', () => {
    expect(asCondition(evaluateSource('unknown', scope))).toBe(false);
    expect(asCondition(evaluateSource('a > 1', scope))).toBe(true);
  });
});
