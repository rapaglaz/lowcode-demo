import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, computed, inject, input } from '@angular/core';
import { isContainerType, UiNode } from '../core/config.types';
import { BuilderStore } from './builder.store';
import { PALETTE_LIST_ID } from './palette';
import { isWithin } from './tree-ops';

/**
 * Recursive drop list for one container. All lists sit in one `cdkDropListGroup`
 * (see the builder page), so nodes can move between any two containers.
 */
@Component({
  selector: 'mm-canvas-list',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <ol
      cdkDropList
      class="drop-list"
      [id]="'drop-' + container().id"
      [cdkDropListData]="container().id"
      [cdkDropListEnterPredicate]="canEnter"
      [attr.aria-label]="'Children of ' + (container().props?.label ?? container().id)"
      [attr.data-testid]="'drop-' + container().id"
      (cdkDropListDropped)="drop($event)"
    >
      @for (
        child of container().children ?? [];
        track child.id;
        let first = $first;
        let last = $last
      ) {
        <li
          cdkDrag
          [cdkDragData]="child.id"
          class="canvas-node"
          [attr.data-testid]="'canvas-node-' + child.id"
        >
          <div class="row" [class.selected]="child.id === store.selectedId()">
            <span cdkDragHandle class="handle" aria-hidden="true">⠿</span>
            <button
              type="button"
              class="select"
              [attr.aria-pressed]="child.id === store.selectedId()"
              [attr.data-testid]="'select-' + child.id"
              (click)="store.select(child.id)"
            >
              {{ child.props?.label ?? child.id }} <small>{{ child.type }}</small>
            </button>
            <button
              type="button"
              [disabled]="first"
              [attr.aria-label]="'Move ' + child.id + ' up'"
              (click)="store.shiftNode(child.id, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              [disabled]="last"
              [attr.aria-label]="'Move ' + child.id + ' down'"
              (click)="store.shiftNode(child.id, 1)"
            >
              ↓
            </button>
          </div>
          @if (isContainer(child)) {
            <mm-canvas-list [container]="child" />
          }
        </li>
      } @empty {
        <li class="empty">Drop widgets here</li>
      }
    </ol>
  `,
  styles: `
    .drop-list {
      list-style: none;
      margin: 0;
      padding: 0.5rem;
      min-height: 3rem;
      border: 1px dashed var(--color-border);
      border-radius: 4px;
    }
    .canvas-node {
      margin-bottom: 0.5rem;
      background: #fff;
    }
    .canvas-node > mm-canvas-list {
      display: block;
      margin: 0.25rem 0 0 1.5rem;
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: 4px;
    }
    .row.selected {
      outline: 2px solid var(--color-primary);
    }
    .handle {
      cursor: grab;
      padding: 0 0.25rem;
    }
    .select {
      flex: 1;
      text-align: left;
      border-color: var(--color-border);
      color: var(--color-text);
    }
    small {
      color: var(--color-muted);
    }
    .empty {
      color: var(--color-muted);
    }
  `,
})
export class CanvasList {
  readonly container = input.required<UiNode>();
  protected readonly store = inject(BuilderStore);

  protected readonly isContainer = (node: UiNode): boolean => isContainerType(node.type);

  /** A container must not be dropped into itself or into one of its descendants. */
  protected readonly canEnter = (drag: CdkDrag<string>): boolean =>
    drag.dropContainer.id === PALETTE_LIST_ID ||
    !isWithin(this.store.config().root, drag.data, this.container().id);

  protected drop(event: CdkDragDrop<string, string, string>): void {
    const target = { parentId: event.container.data, index: event.currentIndex };
    if (event.previousContainer.id === PALETTE_LIST_ID) {
      this.store.addNode(event.item.data, target.parentId, target.index);
    } else {
      this.store.moveNode(event.item.data, target);
    }
  }
}

/** Canvas for the whole screen: the root section's children. */
@Component({
  selector: 'mm-canvas',
  imports: [CanvasList],
  template: `
    <h2 id="canvas-title">Canvas</h2>
    <div role="region" aria-labelledby="canvas-title" data-testid="canvas">
      <mm-canvas-list [container]="root()" />
    </div>
  `,
})
export class Canvas {
  private readonly store = inject(BuilderStore);
  protected readonly root = computed(() => this.store.config().root);
}
