import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ConfigIssue, ScreenConfig } from '../core/config.types';
import { loadConfig, validateConfig } from '../core/schema';
import {
  addNodeCommand,
  BuilderCommand,
  moveNodeCommand,
  removeNodeCommand,
  replaceConfigCommand,
  updateNodeCommand,
} from './commands';
import { createNode, findNode, locateNode, NodeLocation, NodePatch } from './tree-ops';

/** Upper bound for the undo history, so that long sessions do not grow without limit. */
const HISTORY_LIMIT = 100;

export const STARTER_CONFIG: ScreenConfig = {
  schemaVersion: 3,
  id: 'neuer_bildschirm',
  title: 'Neuer Bildschirm',
  root: {
    id: 'root',
    type: 'section',
    children: [
      { id: 'name', type: 'text-field', props: { label: 'Name' }, validators: { required: true } },
    ],
  },
};

type BuilderState = {
  readonly config: ScreenConfig;
  readonly selectedId: string | null;
  readonly past: readonly BuilderCommand[];
  readonly future: readonly BuilderCommand[];
};

export type ImportResult =
  { readonly ok: true } | { readonly ok: false; readonly issues: readonly ConfigIssue[] };

/**
 * Builder state. All changes of the config go through `execute`, which is the
 * only place that writes `config`; this keeps undo/redo complete by construction.
 */
export const BuilderStore = signalStore(
  withState<BuilderState>({ config: STARTER_CONFIG, selectedId: null, past: [], future: [] }),

  withComputed(({ config, selectedId, past, future }) => ({
    selectedNode: computed(() => findNode(config().root, selectedId())),
    canUndo: computed(() => past().length > 0),
    canRedo: computed(() => future().length > 0),
    undoLabel: computed(() => past().at(-1)?.label ?? null),
    redoLabel: computed(() => future().at(-1)?.label ?? null),
    json: computed(() => JSON.stringify(config(), null, 2)),
    validation: computed(() => validateConfig(config())),
  })),

  withMethods((store) => {
    const execute = (command: BuilderCommand | null): void => {
      if (!command) return;
      patchState(store, (state) => ({
        config: command.execute(state.config),
        past: [...state.past, command].slice(-HISTORY_LIMIT),
        future: [],
      }));
    };

    /** Drops a selection that points to a node which no longer exists. */
    const keepSelectionValid = (): void => {
      const id = store.selectedId();
      if (id !== null && !findNode(store.config().root, id))
        patchState(store, { selectedId: null });
    };

    return {
      execute,

      undo(): void {
        const command = store.past().at(-1);
        if (!command) return;
        patchState(store, (state) => ({
          config: command.undo(state.config),
          past: state.past.slice(0, -1),
          future: [...state.future, command],
        }));
        keepSelectionValid();
      },

      redo(): void {
        const command = store.future().at(-1);
        if (!command) return;
        patchState(store, (state) => ({
          config: command.execute(state.config),
          past: [...state.past, command],
          future: state.future.slice(0, -1),
        }));
        keepSelectionValid();
      },

      select(id: string | null): void {
        patchState(store, { selectedId: id });
      },

      addNode(type: string, parentId: string, index: number): string {
        const node = createNode(store.config().root, type);
        execute(addNodeCommand(parentId, index, node));
        patchState(store, { selectedId: node.id });
        return node.id;
      },

      moveNode(id: string, target: NodeLocation): void {
        execute(moveNodeCommand(store.config(), id, target));
      },

      /** Keyboard alternative to drag and drop: move one position up or down. */
      shiftNode(id: string, delta: -1 | 1): void {
        const location = locateNode(store.config().root, id);
        if (!location) return;
        const siblings = findNode(store.config().root, location.parentId)?.children ?? [];
        const index = location.index + delta;
        if (index < 0 || index >= siblings.length) return;
        execute(moveNodeCommand(store.config(), id, { parentId: location.parentId, index }));
      },

      updateNode(id: string, patch: NodePatch): void {
        execute(updateNodeCommand(store.config(), id, patch));
      },

      removeNode(id: string): void {
        execute(removeNodeCommand(store.config(), id));
        keepSelectionValid();
      },

      updateHeader(patch: Partial<Pick<ScreenConfig, 'id' | 'title'>>): void {
        const before = store.config();
        execute(replaceConfigCommand(before, { ...before, ...patch }, 'Edit screen header'));
      },

      replaceConfig(config: ScreenConfig, label: string): void {
        execute(replaceConfigCommand(store.config(), config, label));
        patchState(store, { selectedId: null });
      },

      /** Accepts any supported schema version; older versions are migrated on import. */
      importJson(text: string): ImportResult {
        let raw: unknown;
        try {
          raw = JSON.parse(text);
        } catch (e) {
          return {
            ok: false,
            issues: [{ path: '$', message: `Invalid JSON: ${(e as Error).message}` }],
          };
        }
        const result = loadConfig(raw);
        if (!result.ok) return result;
        execute(replaceConfigCommand(store.config(), result.config, 'Import JSON'));
        patchState(store, { selectedId: null });
        return { ok: true };
      },
    };
  }),
);

export type BuilderStore = InstanceType<typeof BuilderStore>;
