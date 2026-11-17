import { Expr } from './ast';
import { parse } from './parser';

/** Prints an AST in fully parenthesised form, which makes precedence visible in tests. */
function show(expr: Expr): string {
  switch (expr.kind) {
    case 'literal':
      return JSON.stringify(expr.value);
    case 'ref':
      return expr.path;
    case 'unary':
      return `(${expr.op}${show(expr.operand)})`;
    case 'binary':
      return `(${show(expr.left)} ${expr.op} ${show(expr.right)})`;
  }
}

describe('parse', () => {
  it.each([
    ['1 + 2 * 3', '(1 + (2 * 3))'],
    ['(1 + 2) * 3', '((1 + 2) * 3)'],
    ['a - b - c', '((a - b) - c)'],
    ['a / b * c', '((a / b) * c)'],
    ['a || b && c', '(a || (b && c))'],
    ['a == 1 && b != 2', '((a == 1) && (b != 2))'],
    ['x < 1 == true', '((x < 1) == true)'],
    ['!a && b', '((!a) && b)'],
    ['-a * 2', '((-a) * 2)'],
    ['!(a || b)', '(!(a || b))'],
    ["type == 'monteur'", '(type == "monteur")'],
    ['null', 'null'],
    ['contact.phone', 'contact.phone'],
  ])('parses %j as %s', (source, expected) => {
    const result = parse(source);
    expect(result.ok).toBe(true);
    if (result.ok) expect(show(result.value)).toBe(expected);
  });

  it.each([
    ['', 'Unexpected end of expression'],
    ['1 +', 'Unexpected end of expression'],
    ['(1 + 2', "Expected ')' at position 6"],
    ['1 2', 'Unexpected token at position 2'],
    [')', "Unexpected ')' at position 0"],
    ['* 2', "Unexpected operator '*' at position 0"],
    ['a ~ b', "Unknown character '~' at position 2"],
  ])('returns an error for %j', (source, message) => {
    expect(parse(source)).toEqual({ ok: false, error: message });
  });
});
