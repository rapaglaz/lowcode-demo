import { DOCUMENT } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ConfigIssue } from '../core/config.types';
import { ConfigErrorPanel } from '../renderer/config-error-panel';
import { BuilderStore } from './builder.store';

/** Shows the current config as JSON and handles export and import. */
@Component({
  selector: 'mm-json-view',
  imports: [ConfigErrorPanel],
  template: `
    <h2 id="json-title">JSON</h2>
    <div class="actions">
      <button type="button" data-testid="export-json" (click)="export()">Export JSON</button>
    </div>
    <pre tabindex="0" aria-labelledby="json-title" data-testid="json-view">{{ store.json() }}</pre>

    <div class="field">
      <label for="import-json">Import JSON (any schema version)</label>
      <textarea #source id="import-json" rows="5" data-testid="import-json"></textarea>
    </div>
    <button type="button" data-testid="import-button" (click)="import(source.value)">Import</button>
    @if (importIssues(); as issues) {
      <mm-config-error-panel title="Import failed" [issues]="issues" />
    }
  `,
  styles: `
    pre {
      max-height: 24rem;
      overflow: auto;
      background: var(--color-surface);
      padding: 0.75rem;
      font-size: 0.8125rem;
    }
    .actions {
      margin-bottom: 0.5rem;
    }
  `,
})
export class JsonView {
  protected readonly store = inject(BuilderStore);
  private readonly document = inject(DOCUMENT);
  protected readonly importIssues = signal<readonly ConfigIssue[] | null>(null);

  /** A Blob URL on a temporary anchor; no sanitizer bypass is needed for this. */
  protected export(): void {
    const blob = new Blob([this.store.json()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = this.document.createElement('a');
    anchor.href = url;
    anchor.download = `${this.store.config().id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected import(text: string): void {
    const result = this.store.importJson(text);
    this.importIssues.set(result.ok ? null : result.issues);
  }
}
