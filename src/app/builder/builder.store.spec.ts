import { TestBed } from '@angular/core/testing';
import { BuilderStore, STARTER_CONFIG } from './builder.store';

describe('BuilderStore', () => {
  function setup() {
    TestBed.configureTestingModule({ providers: [BuilderStore] });
    return TestBed.inject(BuilderStore);
  }

  const ids = (store: BuilderStore) => store.config().root.children?.map((n) => n.id);

  it('adds a node, selects it, and undo/redo replays the command', () => {
    const store = setup();
    const id = store.addNode('number-field', 'root', 0);
    expect(ids(store)).toEqual([id, 'name']);
    expect(store.selectedId()).toBe(id);

    store.undo();
    expect(store.config()).toEqual(STARTER_CONFIG);
    expect(store.selectedId()).toBeNull();
    expect(store.canRedo()).toBe(true);

    store.redo();
    expect(ids(store)).toEqual([id, 'name']);
  });

  it('a new command clears the redo stack', () => {
    const store = setup();
    store.addNode('text-field', 'root', 1);
    store.undo();
    store.updateNode('name', { props: { label: 'Vorname' } });
    expect(store.canRedo()).toBe(false);
  });

  it('undoes a label edit back to the previous props', () => {
    const store = setup();
    store.updateNode('name', { props: { label: 'Vorname' } });
    expect(store.config().root.children?.[0].props?.label).toBe('Vorname');
    store.undo();
    expect(store.config().root.children?.[0].props?.label).toBe('Name');
  });

  it('restores a removed node at its old position', () => {
    const store = setup();
    store.addNode('text-field', 'root', 1);
    store.removeNode('name');
    expect(ids(store)).toEqual(['textField1']);
    store.undo();
    expect(ids(store)).toEqual(['name', 'textField1']);
  });

  it('moves nodes and ignores moves out of range', () => {
    const store = setup();
    store.addNode('text-field', 'root', 1);
    store.shiftNode('name', 1);
    expect(ids(store)).toEqual(['textField1', 'name']);
    store.shiftNode('name', 1);
    expect(store.past().length).toBe(2);
    store.undo();
    expect(ids(store)).toEqual(['name', 'textField1']);
  });

  it('imports and migrates JSON as one undoable step', () => {
    const store = setup();
    const result = store.importJson(
      JSON.stringify({
        version: 1,
        id: 'legacy',
        title: 'Legacy',
        fields: [{ name: 'x', widget: 'text' }],
      }),
    );
    expect(result.ok).toBe(true);
    expect(store.config().root.children?.[0].type).toBe('text-field');
    store.undo();
    expect(store.config()).toEqual(STARTER_CONFIG);
  });

  it('rejects invalid JSON without changing state', () => {
    const store = setup();
    const result = store.importJson('{ nope');
    expect(result.ok).toBe(false);
    expect(store.past()).toEqual([]);
  });

  it('exposes validation of the current config', () => {
    const store = setup();
    expect(store.validation().ok).toBe(true);
    store.updateNode('name', { visibleIf: 'unknown == 1' });
    expect(store.validation().ok).toBe(false);
  });
});

describe('BuilderStore no-op edits', () => {
  it('does not record a command for a patch that changes nothing', () => {
    TestBed.configureTestingModule({ providers: [BuilderStore] });
    const store = TestBed.inject(BuilderStore);
    store.updateNode('name', { props: { label: 'Name' } });
    expect(store.canUndo()).toBe(false);
  });
});
