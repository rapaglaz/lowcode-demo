import { Component, input } from '@angular/core';
import { ConfigIssue } from '../core/config.types';

/** Readable list of validation issues; shown instead of a screen that cannot be rendered. */
@Component({
  selector: 'mm-config-error-panel',
  template: `
    <section
      class="panel"
      role="alert"
      aria-labelledby="config-error-title"
      data-testid="config-errors"
    >
      <h2 id="config-error-title">{{ title() }}</h2>
      <p>{{ issues().length }} problem(s) found:</p>
      <ul>
        @for (issue of issues(); track $index) {
          <li data-testid="config-error">
            <code>{{ issue.path }}</code> {{ issue.message }}
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    .panel {
      border: 2px solid var(--color-error);
      border-radius: 6px;
      padding: 1rem 1.25rem;
      background: #fdf3f2;
    }
    h2 {
      color: var(--color-error);
      margin-top: 0;
    }
    code {
      background: #fff;
      padding: 0 0.25rem;
      border-radius: 3px;
    }
    li {
      margin-bottom: 0.25rem;
    }
  `,
})
export class ConfigErrorPanel {
  readonly issues = input.required<readonly ConfigIssue[]>();
  readonly title = input('The configuration is invalid');
}
