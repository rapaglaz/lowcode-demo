import { expect, test } from '@playwright/test';
import { SCREENS } from './screens';
import { expectNoA11yViolations, runStep, serveConfigs } from './support';

test.beforeEach(async ({ page }) => {
  await serveConfigs(page);
});

for (const screen of SCREENS) {
  test(`screen "${screen.id}": validation, conditions, save and a11y`, async ({ page }) => {
    await page.goto(`/run/${screen.id}`);
    await expect(page.getByTestId('screen-title')).toHaveText(screen.title);
    await expectNoA11yViolations(page);

    await test.step('empty save shows required errors', async () => {
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-status')).toContainText('Bitte korrigieren');
      for (const field of screen.requiredFields) {
        await expect(page.getByTestId(`error-${field}`)).toContainText('Bitte füllen');
        await expect(page.getByTestId(`field-${field}`)).toHaveAttribute('aria-invalid', 'true');
      }
      await expectNoA11yViolations(page);
    });

    await test.step('conditional fields toggle', async () => {
      for (const conditional of screen.conditional) {
        await expect(page.getByTestId(conditional.testId)).toHaveCount(0);
        for (const step of conditional.show) await runStep(page, step);
        await expect(page.getByTestId(conditional.testId)).toBeVisible();
        for (const step of conditional.hide) await runStep(page, step);
        await expect(page.getByTestId(conditional.testId)).toHaveCount(0);
      }
    });

    await test.step('valid data saves', async () => {
      for (const step of screen.validSteps) await runStep(page, step);
      await page.getByTestId('save').click();
      await expect(page.getByTestId('save-status')).toHaveText('Gespeichert.');
      for (const text of screen.payloadContains) {
        await expect(page.getByTestId('saved-payload')).toContainText(text);
      }
      await expectNoA11yViolations(page);
    });
  });
}

test('abschlag: reason becomes required above 50 EUR difference', async ({ page }) => {
  await page.goto('/run/abschlag');
  await page.getByTestId('field-customerNumber').fill('12345678');
  await page.getByTestId('field-newInstalment').fill('120');
  await expect(page.getByTestId('field-difference')).toHaveValue('35');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('save-status')).toHaveText('Gespeichert.');

  await page.getByTestId('field-newInstalment').fill('200');
  await expect(page.getByTestId('field-difference')).toHaveValue('115');
  await page.getByTestId('save').click();
  await expect(page.getByTestId('error-reason')).toBeVisible();
});

test('v1 config is migrated and both renderers produce the same fields', async ({ page }) => {
  await page.goto('/run/zaehlerstand');
  await expect(page.getByTestId('migration-notice')).toContainText('schema v1');
  const fields = page.locator('[data-testid^="field-"]');
  await expect(fields).toHaveCount(4);
  const declarative = await fields.evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-testid')),
  );

  await page.getByTestId('toggle-imperative').check();
  await expect(page.locator('mm-node-imperative').first()).toBeAttached();
  await expect(fields).toHaveCount(4);
  expect(await fields.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))).toEqual(
    declarative,
  );
});

test('invalid config shows the error panel', async ({ page }) => {
  await page.goto('/run/kaputt');
  await expect(page.getByTestId('config-errors')).toBeVisible();
  await expect(page.getByTestId('config-error')).toHaveCount(4);
  await expectNoA11yViolations(page);
});

test('config served by a route override is validated too', async ({ page }) => {
  await serveConfigs(page, {
    custom: { schemaVersion: 3, id: 'custom', title: 'X', root: { id: 'root', type: 'section' } },
  });
  await page.goto('/run/custom');
  await expect(page.getByTestId('config-error')).toContainText(
    "A 'section' needs at least one child.",
  );
});

test('unknown widget types render the fallback', async ({ page }) => {
  await serveConfigs(page, {
    custom: {
      schemaVersion: 3,
      id: 'custom',
      title: 'Fallback',
      root: { id: 'root', type: 'section', children: [{ id: 'sig', type: 'signature-pad' }] },
    },
  });
  await page.goto('/run/custom');
  await expect(page.getByTestId('unknown-sig')).toContainText('signature-pad');
});

test('signal forms page passes axe', async ({ page }) => {
  await page.goto('/signal-forms');
  await page.getByTestId('sf-save').click();
  await expect(page.getByTestId('sf-error-customerNumber')).toBeVisible();
  await expectNoA11yViolations(page);
});
