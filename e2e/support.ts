import AxeBuilder from '@axe-core/playwright';
import { expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Playwright runs from the project root (where playwright.config.ts lives).
const CONFIG_DIR = join(process.cwd(), 'public', 'configs');

/**
 * Serves `/configs/<id>.json` through `page.route`. The fixtures are the shipped
 * files, so tests and app cannot drift apart; overrides allow special cases.
 */
export async function serveConfigs(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await page.route('**/configs/*.json', async (route) => {
    const id = new URL(route.request().url()).pathname
      .split('/')
      .pop()!
      .replace(/\.json$/, '');
    if (id in overrides) {
      await route.fulfill({ json: overrides[id] });
      return;
    }
    try {
      await route.fulfill({
        body: readFileSync(join(CONFIG_DIR, `${id}.json`), 'utf8'),
        contentType: 'application/json',
      });
    } catch {
      await route.fulfill({ status: 404, body: 'Not found' });
    }
  });
}

/** Runs axe with WCAG 2.x A/AA rules and expects zero violations. */
export async function expectNoA11yViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary).toEqual([]);
}

/** One user interaction, addressed only by `data-testid`. */
export type Step =
  | { readonly fill: string; readonly value: string }
  | { readonly select: string; readonly value: string }
  | { readonly upload: string; readonly fileName: string }
  | { readonly click: string };

export async function runStep(page: Page, step: Step): Promise<void> {
  if ('fill' in step) {
    await page.getByTestId(step.fill).fill(step.value);
    await page.getByTestId(step.fill).blur();
  } else if ('select' in step) {
    await page.getByTestId(step.select).selectOption(step.value);
  } else if ('upload' in step) {
    await revealDeferred(page, step.upload);
    await page.getByTestId(step.upload).setInputFiles({
      name: step.fileName,
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake image content'),
    });
  } else {
    await page.getByTestId(step.click).click();
  }
}

/**
 * Deferred widgets render a placeholder until it enters the viewport. The node
 * host is scrolled instead of the placeholder, because the host stays attached
 * while `@defer (on viewport)` swaps the placeholder for the widget.
 */
export async function revealDeferred(page: Page, fieldTestId: string): Promise<void> {
  await page.getByTestId(fieldTestId.replace(/^field-/, 'node-')).scrollIntoViewIfNeeded();
  await expect(page.getByTestId(fieldTestId)).toBeVisible();
}
