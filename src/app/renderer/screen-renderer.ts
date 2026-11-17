import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  input,
} from '@angular/core';
import { ScreenConfig } from '../core/config.types';
import { ROOT_PATH } from '../core/schema/value-paths';
import { ChildNode } from './child-node';
import { FORM_RUNTIME, FormRuntime } from './form-runtime';
import { DEFAULT_RULE_STATE, NODE_CONTEXT, NodeContext } from './node-context';

/**
 * Host of one rendered screen. It owns the FormRuntime and provides the root
 * NODE_CONTEXT. The root section itself is not rendered as a widget: its group
 * is the form, and its children are the top-level nodes.
 */
@Component({
  selector: 'mm-screen',
  imports: [ChildNode],
  providers: [
    // Factories resolve lazily, when the first child asks; the component exists by then.
    { provide: FORM_RUNTIME, useFactory: () => inject(ScreenRenderer).runtime },
    { provide: NODE_CONTEXT, useFactory: () => inject(ScreenRenderer).rootContext },
  ],
  template: `
    <div class="screen" [attr.data-testid]="'screen-' + config().id">
      @for (child of config().root.children ?? []; track child.id) {
        <mm-child [node]="child" />
      }
    </div>
  `,
})
export class ScreenRenderer {
  readonly config = input.required<ScreenConfig>();
  readonly readOnly = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  readonly runtime = new FormRuntime(computed(() => this.config().root));

  readonly rootContext: NodeContext = {
    path: computed(() => ROOT_PATH),
    readOnly: this.readOnly,
    control: computed(() => this.runtime.form()),
    state: computed(() => DEFAULT_RULE_STATE),
  };

  /**
   * Validates the whole form. On success it returns the value without hidden fields;
   * otherwise it shows all errors and moves focus to the first invalid field.
   */
  submit(): Record<string, unknown> | null {
    const form = this.runtime.form();
    if (form.valid) return form.value;

    form.markAllAsTouched();
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      { injector: this.injector },
    );
    return null;
  }

  reset(): void {
    this.runtime.form().reset();
  }
}
