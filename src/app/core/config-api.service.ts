import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import { ConfigLoadResult, ScreenConfig } from './config.types';
import { loadConfig } from './schema';

/**
 * Loads screen configurations. Configs saved from the builder live in memory and
 * take precedence over the static files in `public/configs/`.
 */
@Service()
export class ConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly drafts = signal<ReadonlyMap<string, ScreenConfig>>(new Map());

  /** Emits once and completes; unsubscribing cancels the HTTP request. */
  load(id: string): Observable<ConfigLoadResult> {
    const draft = this.drafts().get(id);
    if (draft) return of(loadConfig(draft));

    return this.http.get<unknown>(`/configs/${encodeURIComponent(id)}.json`).pipe(
      map((raw) => loadConfig(raw)),
      catchError((error: unknown) =>
        of<ConfigLoadResult>({
          ok: false,
          issues: [{ path: '$', message: describeHttpError(id, error) }],
        }),
      ),
    );
  }

  /** Stores a builder config so that `/run/<id>` can render it. */
  saveDraft(config: ScreenConfig): void {
    this.drafts.update((drafts) => new Map(drafts).set(config.id, config));
  }
}

function describeHttpError(id: string, error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return error.status === 404
      ? `Configuration '${id}' was not found.`
      : `Configuration '${id}' could not be loaded (HTTP ${error.status}).`;
  }
  return `Configuration '${id}' could not be loaded.`;
}
