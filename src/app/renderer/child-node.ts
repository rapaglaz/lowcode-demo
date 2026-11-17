import { Component, inject, input } from '@angular/core';
import { UiNode } from '../core/config.types';
import { ImperativeNodeRenderer } from './imperative-node-renderer';
import { NodeRenderer } from './node-renderer';
import { RENDER_MODE } from './render-mode';

/** Strategy switch: containers render children through this, so the active renderer can be toggled. */
@Component({
  selector: 'mm-child',
  imports: [NodeRenderer, ImperativeNodeRenderer],
  host: { style: 'display: contents' },
  template: `
    @if (mode() === 'imperative') {
      <mm-node-imperative [node]="node()" />
    } @else {
      <mm-node [node]="node()" />
    }
  `,
})
export class ChildNode {
  readonly node = input.required<UiNode>();
  protected readonly mode = inject(RENDER_MODE);
}
