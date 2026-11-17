import { Component, computed, inject, input } from '@angular/core';
import { UiNode } from '../core/config.types';
import { ChildNode } from '../renderer/child-node';
import { domId, NODE_CONTEXT } from '../renderer/node-context';

/** Container that groups children; it maps to a nested FormGroup. */
@Component({
  selector: 'mm-section',
  imports: [ChildNode],
  template: `
    <fieldset class="section" [attr.data-testid]="'section-' + baseId()">
      <legend>{{ node().props?.label ?? node().id }}</legend>
      @if (node().props?.hint; as hint) {
        <p class="field-hint">{{ hint }}</p>
      }
      @for (child of node().children ?? []; track child.id) {
        <mm-child [node]="child" />
      }
    </fieldset>
  `,
  styles: `
    .section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 1rem;
      margin: 0 0 1rem;
    }
    legend {
      font-weight: 700;
      padding: 0 0.25rem;
    }
  `,
})
export class Section {
  readonly node = input.required<UiNode>();
  private readonly context = inject(NODE_CONTEXT);
  protected readonly baseId = computed(() => domId(this.context.path()));
}
