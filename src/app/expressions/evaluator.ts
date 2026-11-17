import { Expr, Literal } from './ast';
import { parse } from './parser';
import { err, ok, Result } from './result';

/** Values the evaluator can produce. Field values outside this set are rejected. */
export type Value = Literal;

/** Read-only view on the current form value, e.g. `{ readingType: 'monteur' }`. */
export type Scope = Readonly<Record<string, unknown>>;

const isValue = (v: unknown): v is Value =>
  v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean';

function resolve(path: string, scope: Scope): Result<Value> {
  let current: unknown = scope;
  for (const segment of path.split('.')) {
    if (
      current === null ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      return err(`Unknown identifier '${path}'`);
    }
    current = (current as Record<string, unknown>)[segment];
  }
  // Empty form controls deliver `undefined` or `''`; both are treated as null.
  if (current === undefined || current === '') return ok(null);
  return isValue(current) ? ok(current) : err(`Identifier '${path}' is not a primitive value`);
}

const truthy = (v: Value): boolean => v !== null && v !== false && v !== 0 && v !== '';

function arithmetic(op: '+' | '-' | '*' | '/', l: Value, r: Value): Result<Value> {
  if (op === '+' && typeof l === 'string' && typeof r === 'string') return ok(l + r);
  if (typeof l !== 'number' || typeof r !== 'number') {
    return err(`Operator '${op}' needs numbers, got ${describe(l)} and ${describe(r)}`);
  }
  switch (op) {
    case '+':
      return ok(l + r);
    case '-':
      return ok(l - r);
    case '*':
      return ok(l * r);
    case '/':
      return r === 0 ? err('Division by zero') : ok(l / r);
  }
}

function compare(op: '<' | '<=' | '>' | '>=', l: Value, r: Value): Result<Value> {
  const comparable =
    (typeof l === 'number' && typeof r === 'number') ||
    (typeof l === 'string' && typeof r === 'string');
  if (!comparable) {
    return err(`Operator '${op}' cannot compare ${describe(l)} and ${describe(r)}`);
  }
  // Both sides have the same primitive type here, so the native comparison is well defined.
  const a = l as number | string;
  const b = r as number | string;
  switch (op) {
    case '<':
      return ok(a < b);
    case '<=':
      return ok(a <= b);
    case '>':
      return ok(a > b);
    case '>=':
      return ok(a >= b);
  }
}

const describe = (v: Value): string => (v === null ? 'null' : typeof v);

/** Walks the AST. Pure function: same expression and scope give the same result. */
export function evaluate(expr: Expr, scope: Scope): Result<Value> {
  switch (expr.kind) {
    case 'literal':
      return ok(expr.value);

    case 'ref':
      return resolve(expr.path, scope);

    case 'unary': {
      const operand = evaluate(expr.operand, scope);
      if (!operand.ok) return operand;
      if (expr.op === '!') return ok(!truthy(operand.value));
      return typeof operand.value === 'number'
        ? ok(-operand.value)
        : err(`Unary '-' needs a number, got ${describe(operand.value)}`);
    }

    case 'binary': {
      const left = evaluate(expr.left, scope);
      if (!left.ok) return left;

      // Short-circuit: the right side is not evaluated, so its errors do not matter.
      if (expr.op === '&&' && !truthy(left.value)) return ok(false);
      if (expr.op === '||' && truthy(left.value)) return ok(true);

      const right = evaluate(expr.right, scope);
      if (!right.ok) return right;

      switch (expr.op) {
        case '&&':
        case '||':
          return ok(truthy(right.value));
        case '==':
          return ok(left.value === right.value);
        case '!=':
          return ok(left.value !== right.value);
        case '<':
        case '<=':
        case '>':
        case '>=':
          return compare(expr.op, left.value, right.value);
        case '+':
        case '-':
        case '*':
        case '/':
          return arithmetic(expr.op, left.value, right.value);
      }
    }
  }
}

/** Convenience for one-off evaluation; hot paths should parse once and reuse the AST. */
export function evaluateSource(source: string, scope: Scope): Result<Value> {
  const ast = parse(source);
  return ast.ok ? evaluate(ast.value, scope) : ast;
}

/** Interprets a result as a condition. Errors count as `false`; callers surface the error separately. */
export function asCondition(result: Result<Value>): boolean {
  return result.ok && truthy(result.value);
}
