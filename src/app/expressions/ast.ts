import { Operator } from './tokenizer';

export type BinaryOperator = Exclude<Operator, '!'>;
export type UnaryOperator = '!' | '-';
export type Literal = number | string | boolean | null;

/** Abstract syntax tree of an expression (Interpreter pattern: one node kind per grammar rule). */
export type Expr =
  | { readonly kind: 'literal'; readonly value: Literal }
  | { readonly kind: 'ref'; readonly path: string }
  | { readonly kind: 'unary'; readonly op: UnaryOperator; readonly operand: Expr }
  | {
      readonly kind: 'binary';
      readonly op: BinaryOperator;
      readonly left: Expr;
      readonly right: Expr;
    };
