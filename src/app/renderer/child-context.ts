import { computed, inject, Signal } from '@angular/core';
import { UiNode } from '../core/config.types';
import { childPath } from '../core/schema/value-paths';
import { FORM_RUNTIME } from './form-runtime';
import { DEFAULT_RULE_STATE, NODE_CONTEXT, NodeContext } from './node-context';

/**
 * Derives the context of a node from its parent's context. Shared by both
 * renderers; must run in an injection context.
 */
export function createChildContext(node: Signal<UiNode>): NodeContext {
  const parent = inject(NODE_CONTEXT);
  const runtime = inject(FORM_RUNTIME);

  const path = computed(() => childPath(parent.path(), node().id));
  return {
    path,
    readOnly: parent.readOnly,
    control: computed(() => parent.control()?.get(node().id) ?? null),
    state: computed(() => runtime.rules().get(path()) ?? DEFAULT_RULE_STATE),
  };
}
