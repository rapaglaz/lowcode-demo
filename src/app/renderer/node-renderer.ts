import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject, Injector, input, resource } from '@angular/core';
import { UiNode } from '../core/config.types';
import { createChildContext } from './child-context';
import { domId, NODE_CONTEXT } from './node-context';
import { DEFERRED_WIDGETS, resolveWidget, UI_REGISTRY } from './ui-registry';

/**
 * Declarative recursive renderer. It resolves the widget type with `resource()`
 * and renders it with `NgComponentOutlet`. Containers render `mm-node` again
 * for their children, so the recursion goes through the widgets (Composite).
 */
@Component({
  selector: 'mm-node',
  imports: [NgComponentOutlet],
  host: { '[attr.data-node-id]': 'node().id' },
  template: `
    @if (context.state().visible) {
      @if (widget.value(); as component) {
        @if (deferred()) {
          @defer (on viewport) {
            <ng-container *ngComponentOutlet="component; inputs: inputs(); injector: injector" />
          } @placeholder {
            <div class="defer-placeholder" [attr.data-testid]="'placeholder-' + testId()">
              {{ node().props?.label ?? node().id }}
            </div>
          }
        } @else {
          <ng-container *ngComponentOutlet="component; inputs: inputs(); injector: injector" />
        }
      } @else if (widget.error()) {
        <p class="field-error" role="alert">Widget '{{ node().type }}' could not be loaded.</p>
      }
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .defer-placeholder {
      min-height: 5rem;
    }
  `,
})
export class NodeRenderer {
  readonly node = input.required<UiNode>();

  private readonly registry = inject(UI_REGISTRY);
  protected readonly context = createChildContext(this.node);

  /** Created once: a new injector would make NgComponentOutlet recreate the widget. */
  protected readonly injector = Injector.create({
    providers: [{ provide: NODE_CONTEXT, useValue: this.context }],
    parent: inject(Injector),
  });

  /** Reloads only when the type changes, so prop edits keep the component instance. */
  protected readonly widget = resource({
    params: () => this.node().type,
    loader: ({ params: type }) => resolveWidget(this.registry, type)(),
  });

  protected readonly inputs = computed(() => ({ node: this.node() }));
  protected readonly deferred = computed(() => DEFERRED_WIDGETS.has(this.node().type));
  protected readonly testId = computed(() => domId(this.context.path()));
}
