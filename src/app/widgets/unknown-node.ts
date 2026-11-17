import { Component, computed, inject, input } from '@angular/core';
import { UiNode } from '../core/config.types';
import { domId, NODE_CONTEXT } from '../renderer/node-context';

/** Fallback for node types without a registered widget; the rest of the screen still renders. */
@Component({
  selector: 'mm-unknown-node',
  template: `
    <div class="unknown" role="note" [attr.data-testid]="'unknown-' + baseId()">
      Unknown widget type <code>{{ node().type }}</code> for node <code>{{ node().id }}</code>.
    </div>
  `,
  styles: `
    .unknown {
      border: 1px dashed var(--color-error);
      color: var(--color-error);
      padding: 0.5rem 0.75rem;
      margin-bottom: 1rem;
      border-radius: 4px;
    }
  `,
})
export class UnknownNode {
  readonly node = input.required<UiNode>();
  private readonly context = inject(NODE_CONTEXT);
  protected readonly baseId = computed(() => domId(this.context.path()));
}
