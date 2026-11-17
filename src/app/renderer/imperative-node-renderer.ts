import {
  Component,
  ComponentRef,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  resource,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { UiNode } from '../core/config.types';
import { createChildContext } from './child-context';
import { NODE_CONTEXT } from './node-context';
import { resolveWidget, UI_REGISTRY } from './ui-registry';

/**
 * Imperative variant of `mm-node`: the same job with `ViewContainerRef.createComponent`,
 * `setInput` and `destroy()`. Everything the template syntax does for us in the
 * declarative renderer is explicit here, including the cleanup.
 */
@Component({
  selector: 'mm-node-imperative',
  host: { '[attr.data-node-id]': 'node().id', style: 'display: block' },
  // The anchor keeps created widgets inside this element instead of next to it.
  template: '<ng-container #outlet />',
})
export class ImperativeNodeRenderer {
  readonly node = input.required<UiNode>();

  private readonly registry = inject(UI_REGISTRY);
  private readonly outlet = viewChild('outlet', { read: ViewContainerRef });
  private readonly context = createChildContext(this.node);
  private readonly injector = Injector.create({
    providers: [{ provide: NODE_CONTEXT, useValue: this.context }],
    parent: inject(Injector),
  });
  private readonly widget = resource({
    params: () => this.node().type,
    loader: ({ params: type }) => resolveWidget(this.registry, type)(),
  });

  private componentRef: ComponentRef<unknown> | null = null;

  constructor() {
    // Lifecycle effect: create or destroy the component when type or visibility changes.
    effect(() => {
      const outlet = this.outlet();
      const component = this.widget.value();
      const visible = this.context.state().visible;
      untracked(() => {
        if (!outlet || !component || !visible) {
          this.destroyComponent();
          return;
        }
        if (this.componentRef?.componentType !== component) {
          this.destroyComponent();
          this.componentRef = outlet.createComponent(component, {
            injector: this.injector,
          });
          this.componentRef.setInput('node', this.node());
        }
      });
    });

    // Input effect: push new node data into the existing instance.
    effect(() => {
      const node = this.node();
      untracked(() => this.componentRef?.setInput('node', node));
    });

    // Created components are not part of a template, so nobody else destroys them.
    inject(DestroyRef).onDestroy(() => this.destroyComponent());
  }

  private destroyComponent(): void {
    this.componentRef?.destroy();
    this.componentRef = null;
  }
}
