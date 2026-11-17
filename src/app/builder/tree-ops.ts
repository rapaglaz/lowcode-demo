import { isContainerType, UiNode } from '../core/config.types';

/** Pure, immutable operations on the node tree. Every function returns a new tree. */

export type NodePatch = Partial<Omit<UiNode, 'id' | 'type' | 'children'>>;

export type NodeLocation = { readonly parentId: string; readonly index: number };

export function findNode(root: UiNode, id: string | null): UiNode | null {
  if (id === null) return null;
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

export function locateNode(root: UiNode, id: string): NodeLocation | null {
  const children = root.children ?? [];
  const index = children.findIndex((child) => child.id === id);
  if (index >= 0) return { parentId: root.id, index };
  for (const child of children) {
    const found = locateNode(child, id);
    if (found) return found;
  }
  return null;
}

/** True when `candidateId` is `ancestorId` itself or lies below it. */
export function isWithin(root: UiNode, ancestorId: string, candidateId: string): boolean {
  const ancestor = findNode(root, ancestorId);
  return ancestor !== null && findNode(ancestor, candidateId) !== null;
}

function mapNode(root: UiNode, id: string, fn: (node: UiNode) => UiNode): UiNode {
  if (root.id === id) return fn(root);
  if (!root.children) return root;
  let changed = false;
  const children = root.children.map((child) => {
    const next = mapNode(child, id, fn);
    if (next !== child) changed = true;
    return next;
  });
  // Unchanged branches keep their identity, which keeps the renderer's tracking cheap.
  return changed ? { ...root, children } : root;
}

export function insertNode(root: UiNode, parentId: string, index: number, node: UiNode): UiNode {
  return mapNode(root, parentId, (parent) => {
    const children = [...(parent.children ?? [])];
    children.splice(Math.max(0, Math.min(index, children.length)), 0, node);
    return { ...parent, children };
  });
}

export function removeNode(root: UiNode, id: string): UiNode {
  const location = locateNode(root, id);
  if (!location) return root;
  return mapNode(root, location.parentId, (parent) => ({
    ...parent,
    children: (parent.children ?? []).filter((child) => child.id !== id),
  }));
}

export function moveNode(root: UiNode, id: string, target: NodeLocation): UiNode {
  const node = findNode(root, id);
  if (!node || isWithin(root, id, target.parentId)) return root;
  return insertNode(removeNode(root, id), target.parentId, target.index, node);
}

/** Applies a patch; keys with `undefined` are removed, so that a cleared field disappears from the JSON. */
export function updateNode(root: UiNode, id: string, patch: NodePatch): UiNode {
  return mapNode(root, id, (node) => {
    const next: Record<string, unknown> = { ...node, ...patch };
    for (const key of Object.keys(patch)) {
      if (next[key] === undefined) delete next[key];
    }
    return next as UiNode;
  });
}

export function collectIds(root: UiNode): Set<string> {
  const ids = new Set<string>();
  const visit = (node: UiNode): void => {
    ids.add(node.id);
    node.children?.forEach(visit);
  };
  visit(root);
  return ids;
}

/** `text-field` -> `textField1`, `textField2`, ... depending on the ids already in use. */
export function nextId(root: UiNode, type: string): string {
  const base = type
    .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
    .replace(/[^A-Za-z0-9_]/g, '');
  const ids = collectIds(root);
  let n = 1;
  while (ids.has(`${base}${n}`)) n++;
  return `${base}${n}`;
}

/** Creates a node with sensible defaults, so that the config stays valid after every drop. */
export function createNode(root: UiNode, type: string): UiNode {
  const id = nextId(root, type);
  const labels: Readonly<Record<string, string>> = {
    'text-field': 'Neues Textfeld',
    'number-field': 'Neue Zahl',
    'select-field': 'Neue Auswahl',
    'date-field': 'Neues Datum',
    'upload-field': 'Neuer Upload',
    'textarea-field': 'Neuer Text',
    section: 'Neuer Abschnitt',
    'repeat-list': 'Neue Liste',
  };
  const node: UiNode = { id, type, props: { label: labels[type] ?? type } };

  if (type === 'select-field') {
    return {
      ...node,
      props: {
        ...node.props,
        options: [
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
        ],
      },
    };
  }
  if (isContainerType(type)) {
    // Containers need one child to be valid; the child id must not clash with the container id.
    const withContainer = insertNode(root, root.id, 0, { ...node, children: [] });
    return {
      ...node,
      children: [
        {
          id: nextId(withContainer, 'text-field'),
          type: 'text-field',
          props: { label: 'Neues Textfeld' },
        },
      ],
    };
  }
  return node;
}
