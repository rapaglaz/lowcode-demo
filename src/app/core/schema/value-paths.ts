import { UiNode } from '../config.types';

/**
 * Describes where a node's value lives in the form value.
 * Sections and fields extend the path with their id; the root node does not,
 * because its group is the form itself. Children of a repeat-list live in `item`.
 */
export const ROOT_PATH = '';

export const childPath = (parentPath: string, id: string): string =>
  parentPath === ROOT_PATH ? id : `${parentPath}.${id}`;

/** Prefix that expressions use to address the current repeat-list item. */
export const ITEM_SCOPE = 'item';

/**
 * Returns the set of paths an expression may reference from inside the given list
 * (or from outside any list when `listId` is null). Lists are not addressable as values,
 * because an array is not a primitive the evaluator can work with.
 */
export function referenceablePaths(root: UiNode): {
  readonly global: ReadonlySet<string>;
  readonly perList: ReadonlyMap<string, ReadonlySet<string>>;
} {
  const global = new Set<string>();
  const perList = new Map<string, Set<string>>();

  const visit = (node: UiNode, path: string, target: Set<string>): void => {
    if (node.type === 'repeat-list') {
      const itemPaths = new Set<string>();
      perList.set(node.id, itemPaths);
      for (const child of node.children ?? []) {
        visit(child, childPath(ITEM_SCOPE, child.id), itemPaths);
      }
      return;
    }
    if (node.type !== 'section') {
      target.add(path);
      return;
    }
    for (const child of node.children ?? []) {
      visit(child, childPath(path, child.id), target);
    }
  };

  visit(root, ROOT_PATH, global);
  return { global, perList };
}
