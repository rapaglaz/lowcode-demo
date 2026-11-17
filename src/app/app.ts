import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="app-header">
      <span class="brand">Low-Code Demo</span>
      <nav aria-label="Main navigation">
        <ul>
          @for (link of links; track link.path) {
            <li>
              <a
                [routerLink]="link.path"
                routerLinkActive="active"
                ariaCurrentWhenActive="page"
                [attr.data-testid]="'nav-' + link.testId"
                >{{ link.label }}</a
              >
            </li>
          }
        </ul>
      </nav>
    </header>
    <main id="main">
      <router-outlet />
    </main>
  `,
  styles: `
    .app-header {
      display: flex;
      align-items: center;
      gap: 2rem;
      padding: 0.75rem 1.5rem;
      background: var(--color-primary);
      color: #fff;
    }
    .brand {
      font-weight: 700;
    }
    ul {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    a {
      color: #fff;
      text-decoration: none;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
    }
    a.active,
    a:hover {
      background: rgb(255 255 255 / 0.2);
    }
    main {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
  `,
})
export class App {
  protected readonly links = [
    { path: '/run/zaehlerstand', label: 'Zählerstand', testId: 'zaehlerstand' },
    { path: '/run/abschlag', label: 'Abschlag', testId: 'abschlag' },
    { path: '/run/beschwerde', label: 'Beschwerde', testId: 'beschwerde' },
    { path: '/run/kaputt', label: 'Defekte Config', testId: 'kaputt' },
    { path: '/builder', label: 'Builder', testId: 'builder' },
    { path: '/signal-forms', label: 'Signal Forms', testId: 'signal-forms' },
  ] as const;
}
