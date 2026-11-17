import { ScreenConfig, UiNode } from '../core/config.types';
import {
  findNode,
  insertNode,
  locateNode,
  moveNode,
  NodeLocation,
  NodePatch,
  removeNode,
  updateNode,
} from './tree-ops';

/**
 * Command pattern: every change of the builder is an object that can apply and
 * revert itself. Both directions are pure functions of the config, so commands
 * can be replayed in any session state that matches their precondition.
 */
export type BuilderCommand = {
  readonly label: string;
  execute(config: ScreenConfig): ScreenConfig;
  undo(config: ScreenConfig): ScreenConfig;
};

const withRoot = (config: ScreenConfig, root: UiNode): ScreenConfig =>
  root === config.root ? config : { ...config, root };

export function addNodeCommand(parentId: string, index: number, node: UiNode): BuilderCommand {
  return {
    label: `Add ${node.type} '${node.id}'`,
    execute: (config) => withRoot(config, insertNode(config.root, parentId, index, node)),
    undo: (config) => withRoot(config, removeNode(config.root, node.id)),
  };
}

/** Captures the node and its position now, so that `undo` can restore it exactly. */
export function removeNodeCommand(current: ScreenConfig, id: string): BuilderCommand | null {
  const node = findNode(current.root, id);
  const location = locateNode(current.root, id);
  if (!node || !location) return null;
  return {
    label: `Remove '${id}'`,
    execute: (config) => withRoot(config, removeNode(config.root, id)),
    undo: (config) =>
      withRoot(config, insertNode(config.root, location.parentId, location.index, node)),
  };
}

export function moveNodeCommand(
  current: ScreenConfig,
  id: string,
  target: NodeLocation,
): BuilderCommand | null {
  const origin = locateNode(current.root, id);
  if (!origin) return null;
  if (origin.parentId === target.parentId && origin.index === target.index) return null;
  return {
    label: `Move '${id}'`,
    execute: (config) => withRoot(config, moveNode(config.root, id, target)),
    undo: (config) => withRoot(config, moveNode(config.root, id, origin)),
  };
}

/**
 * Stores the previous values of exactly the patched keys. A patch that changes
 * nothing returns null: native `change` also fires when the user types the old value
 * back, and that must not add an empty undo step.
 */
export function updateNodeCommand(
  current: ScreenConfig,
  id: string,
  patch: NodePatch,
): BuilderCommand | null {
  const node = findNode(current.root, id);
  if (!node) return null;
  const before: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) before[key] = (node as Record<string, unknown>)[key];
  if (JSON.stringify(before) === JSON.stringify(patch)) return null;
  return {
    label: `Edit '${id}'`,
    execute: (config) => withRoot(config, updateNode(config.root, id, patch)),
    undo: (config) => withRoot(config, updateNode(config.root, id, before as NodePatch)),
  };
}

/**
 * Memento: for changes that are hard to invert step by step (import, header edit),
 * the command simply keeps snapshots of the state before and after.
 */
export function replaceConfigCommand(
  before: ScreenConfig,
  after: ScreenConfig,
  label: string,
): BuilderCommand {
  return { label, execute: () => after, undo: () => before };
}
