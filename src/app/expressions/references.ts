import { Expr } from './ast';

/** Collects all field references of an expression, e.g. for static checks in the validator. */
export function collectReferences(expr: Expr): string[] {
  switch (expr.kind) {
    case 'literal':
      return [];
    case 'ref':
      return [expr.path];
    case 'unary':
      return collectReferences(expr.operand);
    case 'binary':
      return [...collectReferences(expr.left), ...collectReferences(expr.right)];
  }
}
