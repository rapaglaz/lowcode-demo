import { err, ok, Result } from './result';

export type Operator =
  '==' | '!=' | '<' | '<=' | '>' | '>=' | '&&' | '||' | '!' | '+' | '-' | '*' | '/';

export type Token =
  | { readonly type: 'number'; readonly value: number; readonly pos: number }
  | { readonly type: 'string'; readonly value: string; readonly pos: number }
  | { readonly type: 'boolean'; readonly value: boolean; readonly pos: number }
  | { readonly type: 'null'; readonly pos: number }
  | { readonly type: 'identifier'; readonly name: string; readonly pos: number }
  | { readonly type: 'operator'; readonly op: Operator; readonly pos: number }
  | { readonly type: 'lparen'; readonly pos: number }
  | { readonly type: 'rparen'; readonly pos: number }
  | { readonly type: 'eof'; readonly pos: number };

// Two-character operators must be matched before their one-character prefixes.
const OPERATORS: readonly Operator[] = [
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '<',
  '>',
  '!',
  '+',
  '-',
  '*',
  '/',
];

const isDigit = (c: string): boolean => c >= '0' && c <= '9';
const isIdentStart = (c: string): boolean => /[A-Za-z_]/.test(c);
const isIdentPart = (c: string): boolean => /[A-Za-z0-9_]/.test(c);

/**
 * Converts source text into tokens. Identifiers may contain dots
 * (`contact.phone`) so that nested form values can be referenced.
 */
export function tokenize(source: string): Result<Token[]> {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const c = source[i];

    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') {
      i++;
      continue;
    }

    if (isDigit(c)) {
      const start = i;
      while (i < source.length && isDigit(source[i])) i++;
      if (source[i] === '.' && isDigit(source[i + 1] ?? '')) {
        i++;
        while (i < source.length && isDigit(source[i])) i++;
      }
      tokens.push({ type: 'number', value: Number(source.slice(start, i)), pos: start });
      continue;
    }

    if (c === "'" || c === '"') {
      const start = i;
      const quote = c;
      i++;
      let value = '';
      while (i < source.length && source[i] !== quote) {
        // Backslash escapes the next character, e.g. 'it\'s'.
        if (source[i] === '\\' && i + 1 < source.length) i++;
        value += source[i];
        i++;
      }
      if (i >= source.length) return err(`Unterminated string starting at position ${start}`);
      i++;
      tokens.push({ type: 'string', value, pos: start });
      continue;
    }

    if (isIdentStart(c)) {
      const start = i;
      while (i < source.length && (isIdentPart(source[i]) || source[i] === '.')) i++;
      const word = source.slice(start, i);
      if (word.endsWith('.') || word.includes('..')) {
        return err(`Invalid identifier '${word}' at position ${start}`);
      }
      if (word === 'true' || word === 'false') {
        tokens.push({ type: 'boolean', value: word === 'true', pos: start });
      } else if (word === 'null') {
        tokens.push({ type: 'null', pos: start });
      } else {
        tokens.push({ type: 'identifier', name: word, pos: start });
      }
      continue;
    }

    if (c === '(' || c === ')') {
      tokens.push({ type: c === '(' ? 'lparen' : 'rparen', pos: i });
      i++;
      continue;
    }

    const op = OPERATORS.find((candidate) => source.startsWith(candidate, i));
    if (op) {
      tokens.push({ type: 'operator', op, pos: i });
      i += op.length;
      continue;
    }

    return err(`Unknown character '${c}' at position ${i}`);
  }

  tokens.push({ type: 'eof', pos: source.length });
  return ok(tokens);
}
