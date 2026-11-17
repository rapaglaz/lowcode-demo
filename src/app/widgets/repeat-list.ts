import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray } from '@angular/forms';
import { map, of, startWith, switchMap } from 'rxjs';
import { UiNode } from '../core/config.types';
import { ChildNode } from '../renderer/child-node';
import { createListItem } from '../renderer/form-builder';
import { DEFAULT_RULE_STATE, domId, NODE_CONTEXT, NodeContext } from '../renderer/node-context';

/**
 * One item of a repeat-list. It provides its own NODE_CONTEXT (path `list.<index>`,
 * control = the item's FormGroup), so the children resolve their controls relative to it.
 */
@Component({
  selector: 'mm-list-item',
  imports: [ChildNode],
  providers: [{ provide: NODE_CONTEXT, useFactory: () => inject(ListItem).itemContext }],
  template: `
    @for (child of node().children ?? []; track child.id) {
      <mm-child [node]="child" />
    }
  `,
})
export class ListItem {
  readonly node = input.required<UiNode>();
  readonly index = input.required<number>();

  /** `skipSelf`, because this element provides NODE_CONTEXT for its children. */
  private readonly listContext = inject(NODE_CONTEXT, { skipSelf: true });

  readonly itemContext: NodeContext = {
    path: computed(() => `${this.listContext.path()}.${this.index()}`),
    readOnly: this.listContext.readOnly,
    control: computed(() => {
      const list = this.listContext.control();
      return list instanceof FormArray ? (list.at(this.index()) ?? null) : null;
    }),
    state: computed(() => DEFAULT_RULE_STATE),
  };
}

/** Container for a repeatable group of fields; it maps to a FormArray of FormGroups. */
@Component({
  selector: 'mm-repeat-list',
  imports: [ListItem],
  template: `
    <fieldset class="list" [attr.data-testid]="'list-' + baseId()">
      <legend>{{ node().props?.label ?? node().id }}</legend>
      @for (item of items(); track item; let i = $index) {
        <div
          class="list-item"
          role="group"
          [attr.aria-labelledby]="baseId() + '-item-' + i"
          [attr.data-testid]="'item-' + baseId() + '-' + i"
        >
          <h3 class="item-title" [id]="baseId() + '-item-' + i">{{ itemLabel() }} {{ i + 1 }}</h3>
          <mm-list-item [node]="node()" [index]="i" />
          @if (!readOnly()) {
            <button
              type="button"
              [disabled]="items().length <= minItems()"
              [attr.data-testid]="'remove-' + baseId() + '-' + i"
              (click)="remove(i)"
            >
              {{ itemLabel() }} {{ i + 1 }} entfernen
            </button>
          }
        </div>
      }
      @if (!readOnly()) {
        <button type="button" [attr.data-testid]="'add-' + baseId()" (click)="add()">
          {{ node().props?.addLabel ?? 'Eintrag hinzufügen' }}
        </button>
      }
    </fieldset>
  `,
  styles: `
    .list {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 1rem;
      margin: 0 0 1rem;
    }
    legend {
      font-weight: 700;
    }
    .list-item {
      border-left: 4px solid var(--color-primary);
      padding: 0.5rem 0 0.5rem 1rem;
      margin-bottom: 1rem;
    }
    .item-title {
      font-size: 1rem;
      margin: 0 0 0.5rem;
    }
  `,
})
export class RepeatList {
  readonly node = input.required<UiNode>();

  private readonly context = inject(NODE_CONTEXT);
  protected readonly baseId = computed(() => domId(this.context.path()));
  protected readonly readOnly = this.context.readOnly;
  protected readonly itemLabel = computed(() => this.node().props?.itemLabel ?? 'Eintrag');
  protected readonly minItems = computed(() => this.node().props?.minItems ?? 0);

  private readonly array = computed(() => {
    const control = this.context.control();
    return control instanceof FormArray ? control : null;
  });

  /** Item controls as a signal; tracking by control identity keeps item views on removal. */
  protected readonly items = toSignal(
    toObservable(this.array).pipe(
      switchMap((array) =>
        array
          ? array.events.pipe(
              startWith(null),
              map((): readonly AbstractControl[] => [...array.controls]),
            )
          : of([]),
      ),
    ),
    { initialValue: [] },
  );

  protected add(): void {
    this.array()?.push(createListItem(this.node()));
  }

  protected remove(index: number): void {
    this.array()?.removeAt(index);
  }
}
