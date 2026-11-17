import { Service, signal } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

export type Submission = {
  readonly id: number;
  readonly configId: string;
  readonly savedAt: string;
  readonly value: unknown;
};

/** Simulated backend for form submissions; it keeps everything in memory. */
@Service()
export class SubmissionService {
  private nextId = 1;
  private readonly store = signal<readonly Submission[]>([]);
  readonly submissions = this.store.asReadonly();

  /** The artificial latency makes the "saving" state visible and testable. */
  save(configId: string, value: unknown): Observable<Submission> {
    const submission: Submission = {
      id: this.nextId++,
      configId,
      savedAt: new Date().toISOString(),
      value: structuredClone(value),
    };
    return of(submission).pipe(
      delay(150),
      tap((saved) => this.store.update((all) => [...all, saved])),
    );
  }
}
