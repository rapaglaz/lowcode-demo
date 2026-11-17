/**
 * Visitor over any tree shape. Each schema version names its children differently
 * (`fields` in v1, `children` later), so the visitor receives an accessor for them.
 */
export type TreeVisitor<In, Out> = {
  readonly children: (node: In) => readonly In[] | undefined;
  /** Called post-order: the children are already transformed. */
  readonly visit: (node: In, children: Out[] | undefined) => Out;
};

/** Pure post-order transformation; the input tree is never mutated. */
export function transformTree<In, Out>(node: In, visitor: TreeVisitor<In, Out>): Out {
  const children = visitor.children(node)?.map((child) => transformTree(child, visitor));
  return visitor.visit(node, children);
}

/** Pre-order walk with the list of ancestors, useful for validation and lookups. */
export function walkTree<N extends { readonly children?: readonly N[] }>(
  node: N,
  callback: (node: N, ancestors: readonly N[]) => void,
  ancestors: readonly N[] = [],
): void {
  callback(node, ancestors);
  for (const child of node.children ?? []) {
    walkTree(child, callback, [...ancestors, node]);
  }
}
