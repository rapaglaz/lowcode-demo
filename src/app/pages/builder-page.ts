import { CdkDropListGroup } from '@angular/cdk/drag-drop';
import { Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BuilderStore } from '../builder/builder.store';
import { Canvas } from '../builder/canvas';
import { JsonView } from '../builder/json-view';
import { Palette } from '../builder/palette';
import { PropertyPanel } from '../builder/property-panel';
import { ConfigApiService } from '../core/config-api.service';
import { ConfigErrorPanel } from '../renderer/config-error-panel';
import { ScreenRenderer } from '../renderer/screen-renderer';

/**
 * Visual editor. The store is provided here, so every visit starts with a fresh
 * history. The preview uses the same renderer as the runtime page.
 */
@Component({
  selector: 'mm-builder-page',
  imports: [
    CdkDropListGroup,
    Palette,
    Canvas,
    PropertyPanel,
    JsonView,
    ScreenRenderer,
    ConfigErrorPanel,
  ],
  providers: [BuilderStore],
  host: { '(document:keydown)': 'onKeydown($event)' },
  templateUrl: './builder-page.html',
  styleUrl: './builder-page.scss',
})
export class BuilderPage {
  protected readonly store = inject(BuilderStore);
  private readonly api = inject(ConfigApiService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly samples = ['zaehlerstand', 'abschlag', 'beschwerde'] as const;
  protected readonly previewConfig = computed(() => {
    const validation = this.store.validation();
    return validation.ok ? validation.config : null;
  });
  protected readonly previewIssues = computed(() => {
    const validation = this.store.validation();
    return validation.ok ? null : validation.issues;
  });

  protected loadSample(id: string): void {
    this.api
      .load(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.ok) this.store.replaceConfig(result.config, `Load sample '${id}'`);
      });
  }

  protected setTitle(title: string): void {
    if (title.trim() && title !== this.store.config().title)
      this.store.updateHeader({ title: title.trim() });
  }

  protected setScreenId(id: string): void {
    if (/^[a-z][a-z0-9_-]*$/.test(id) && id !== this.store.config().id)
      this.store.updateHeader({ id });
  }

  /** Stores the config as a draft and opens it on the runtime page. */
  protected run(): void {
    const config = this.previewConfig();
    if (!config) return;
    this.api.saveDraft(config);
    void this.router.navigate(['/run', config.id]);
  }

  /** Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z; text fields keep their native undo. */
  protected onKeydown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    event.preventDefault();
    if (event.shiftKey) this.store.redo();
    else this.store.undo();
  }
}
