import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject } from '@angular/core';
import { BuilderStore } from './builder.store';

export const PALETTE_LIST_ID = 'palette';

export const PALETTE_ITEMS: readonly { readonly type: string; readonly label: string }[] = [
  { type: 'text-field', label: 'Text' },
  { type: 'number-field', label: 'Number' },
  { type: 'select-field', label: 'Select' },
  { type: 'date-field', label: 'Date' },
  { type: 'textarea-field', label: 'Textarea' },
  { type: 'upload-field', label: 'Upload' },
  { type: 'section', label: 'Section' },
  { type: 'repeat-list', label: 'Repeat list' },
];

/**
 * Source of new nodes. Drag an entry onto the canvas, or activate its button
 * to append it to the root (keyboard alternative to drag and drop).
 */
@Component({
  selector: 'mm-palette',
  imports: [CdkDropList, CdkDrag],
  template: `
    <h2 id="palette-title">Palette</h2>
    <ul
      cdkDropList
      [id]="listId"
      cdkDropListSortingDisabled
      [cdkDropListData]="'palette'"
      aria-labelledby="palette-title"
    >
      @for (item of items; track item.type) {
        <li cdkDrag [cdkDragData]="item.type" [attr.data-testid]="'palette-' + item.type">
          <button
            type="button"
            [attr.aria-label]="'Add ' + item.label + ' to the end of the screen'"
            (click)="append(item.type)"
          >
            {{ item.label }}
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.5rem;
    }
    li {
      cursor: grab;
    }
    button {
      width: 100%;
      text-align: left;
    }
  `,
})
export class Palette {
  private readonly store = inject(BuilderStore);
  protected readonly items = PALETTE_ITEMS;
  protected readonly listId = PALETTE_LIST_ID;

  protected append(type: string): void {
    const root = this.store.config().root;
    this.store.addNode(type, root.id, root.children?.length ?? 0);
  }
}
