import { JsonPipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigApiService } from '../core/config-api.service';
import { Submission, SubmissionService } from '../core/submission.service';
import { ConfigErrorPanel } from '../renderer/config-error-panel';
import { RENDER_MODE, RenderMode } from '../renderer/render-mode';
import { ScreenRenderer } from '../renderer/screen-renderer';

type SaveState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'saving' }
  | { readonly kind: 'saved'; readonly submission: Submission };

/** Renders the configuration given by the route parameter `:id`. */
@Component({
  selector: 'mm-runtime-page',
  imports: [ScreenRenderer, ConfigErrorPanel, JsonPipe],
  providers: [{ provide: RENDER_MODE, useFactory: () => inject(RuntimePage).mode }],
  templateUrl: './runtime-page.html',
  styleUrl: './runtime-page.scss',
})
export class RuntimePage {
  /** Bound from the route via `withComponentInputBinding()`. */
  readonly id = input.required<string>();

  private readonly api = inject(ConfigApiService);
  private readonly submissions = inject(SubmissionService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly screen = viewChild(ScreenRenderer);

  readonly mode = signal<RenderMode>('declarative');
  protected readonly readOnly = signal(false);

  /** `rxResource` unsubscribes from the previous request when the id changes, so it is cancelled. */
  protected readonly config = rxResource({
    params: () => this.id(),
    stream: ({ params: id }) => this.api.load(id),
  });

  protected readonly loaded = computed(() => {
    const result = this.config.value();
    return result?.ok ? result : null;
  });
  protected readonly issues = computed(() => {
    const result = this.config.value();
    return result && !result.ok ? result.issues : null;
  });

  /** Resets to idle whenever another screen is opened. */
  protected readonly saveState = linkedSignal<string, SaveState>({
    source: this.id,
    computation: () => ({ kind: 'idle' }),
  });

  protected toggleMode(imperative: boolean): void {
    this.mode.set(imperative ? 'imperative' : 'declarative');
  }

  protected save(event: Event): void {
    event.preventDefault();
    const screen = this.screen();
    const loaded = this.loaded();
    if (!screen || !loaded || this.saveState().kind === 'saving') return;

    const value = screen.submit();
    if (value === null) {
      this.saveState.set({ kind: 'invalid' });
      return;
    }

    this.saveState.set({ kind: 'saving' });
    const subscription = this.submissions
      .save(loaded.config.id, value)
      .subscribe((submission) => this.saveState.set({ kind: 'saved', submission }));
    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }
}
