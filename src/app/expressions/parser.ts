import { BinaryOperator, Expr } from './ast';
import { err, ok, Result } from './result';
import { Token, tokenize } from './tokenizer';

/**
 * Binding power per binary operator. A higher number binds tighter.
 * The whole precedence table of the language lives here.
 */
const BINDING_POWER: Readonly<Record<BinaryOperator, number>> = {
  '||': 1,
  '&&': 2,
  '==': 3,
  '!=': 3,
  '<': 4,
  '<=': 4,
  '>': 4,
  '>=': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
};
const PREFIX_BINDING_POWER = 7;

/** Internal signal for parse errors; it never leaves `parse()`. */
class ParseError extends Error {}

/**
 * Pratt parser. It uses exceptions internally because unwinding a deep
 * recursion is much simpler that way; the public API returns a Result.
 */
class Parser {
  private index = 0;

  constructor(private readonly tokens: readonly Token[]) {}

  parseProgram(): Expr {
    const expr = this.parseExpression(0);
    const next = this.peek();
    if (next.type !== 'eof') {
      throw new ParseError(`Unexpected token at position ${next.pos}`);
    }
    return expr;
  }

  private parseExpression(minBindingPower: number): Expr {
    let left = this.parsePrefix();

    for (;;) {
      const token = this.peek();
      if (token.type !== 'operator' || token.op === '!') break;
      const power = BINDING_POWER[token.op];
      // Strict `<=` makes operators of equal power left-associative: a - b - c = (a - b) - c.
      if (power <= minBindingPower) break;
      this.index++;
      const right = this.parseExpression(power);
      left = { kind: 'binary', op: token.op, left, right };
    }

    return left;
  }

  private parsePrefix(): Expr {
    const token = this.tokens[this.index++];
    switch (token.type) {
      case 'number':
      case 'string':
      case 'boolean':
        return { kind: 'literal', value: token.value };
      case 'null':
        return { kind: 'literal', value: null };
      case 'identifier':
        return { kind: 'ref', path: token.name };
      case 'lparen': {
        const inner = this.parseExpression(0);
        const closing = this.tokens[this.index++];
        if (closing.type !== 'rparen') {
          throw new ParseError(`Expected ')' at position ${closing.pos}`);
        }
        return inner;
      }
      case 'operator':
        if (token.op === '!' || token.op === '-') {
          return {
            kind: 'unary',
            op: token.op,
            operand: this.parseExpression(PREFIX_BINDING_POWER),
          };
        }
        throw new ParseError(`Unexpected operator '${token.op}' at position ${token.pos}`);
      case 'eof':
        throw new ParseError('Unexpected end of expression');
      case 'rparen':
        throw new ParseError(`Unexpected ')' at position ${token.pos}`);
    }
  }

  private peek(): Token {
    return this.tokens[this.index];
  }
}

export function parseTokens(tokens: readonly Token[]): Result<Expr> {
  try {
    return ok(new Parser(tokens).parseProgram());
  } catch (e) {
    if (e instanceof ParseError) return err(e.message);
    throw e;
  }
}

/** Tokenizes and parses an expression source into an AST. */
export function parse(source: string): Result<Expr> {
  const tokens = tokenize(source);
  return tokens.ok ? parseTokens(tokens.value) : tokens;
}
