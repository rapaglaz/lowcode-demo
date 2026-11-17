import { UiNode } from '../core/config.types';
import {
  createNode,
  findNode,
  isWithin,
  locateNode,
  moveNode,
  nextId,
  removeNode,
  updateNode,
} from './tree-ops';

const tree: UiNode = {
  id: 'root',
  type: 'section',
  children: [
    { id: 'a', type: 'text-field' },
    { id: 'box', type: 'section', children: [{ id: 'b', type: 'text-field' }] },
    { id: 'c', type: 'text-field' },
  ],
};

describe('tree-ops', () => {
  it('finds and locates nested nodes', () => {
    expect(findNode(tree, 'b')?.id).toBe('b');
    expect(locateNode(tree, 'b')).toEqual({ parentId: 'box', index: 0 });
    expect(locateNode(tree, 'root')).toBeNull();
  });

  it('moves a node into another container', () => {
    const moved = moveNode(tree, 'c', { parentId: 'box', index: 0 });
    expect(findNode(moved, 'box')?.children?.map((n) => n.id)).toEqual(['c', 'b']);
    expect(moved.children?.map((n) => n.id)).toEqual(['a', 'box']);
  });

  it('refuses to move a container into itself', () => {
    expect(isWithin(tree, 'box', 'b')).toBe(true);
    expect(moveNode(tree, 'box', { parentId: 'box', index: 0 })).toBe(tree);
  });

  it('keeps identity of untouched branches', () => {
    const updated = updateNode(tree, 'a', { props: { label: 'A' } });
    expect(updated.children?.[1]).toBe(tree.children?.[1]);
    expect(updated.children?.[0].props?.label).toBe('A');
  });

  it('removes keys patched with undefined', () => {
    const withRule = updateNode(tree, 'a', { visibleIf: 'c == 1' });
    expect(updateNode(withRule, 'a', { visibleIf: undefined }).children?.[0]).toEqual({
      id: 'a',
      type: 'text-field',
    });
  });

  it('removes nodes without mutating the input', () => {
    const snapshot = structuredClone(tree);
    removeNode(tree, 'b');
    expect(tree).toEqual(snapshot);
  });

  it('generates unique ids', () => {
    expect(nextId(tree, 'text-field')).toBe('textField1');
    const withOne = updateNode(tree, 'a', {});
    expect(
      nextId(
        {
          ...withOne,
          children: [...(withOne.children ?? []), { id: 'textField1', type: 'text-field' }],
        },
        'text-field',
      ),
    ).toBe('textField2');
  });

  it('creates containers with a valid child', () => {
    const section = createNode(tree, 'section');
    expect(section.id).toBe('section1');
    expect(section.children?.[0].id).toBe('textField1');
  });
});
