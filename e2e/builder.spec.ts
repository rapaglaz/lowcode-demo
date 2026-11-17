import { expect, Locator, Page, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { expectNoA11yViolations, serveConfigs } from './support';

/**
 * CDK drag and drop listens to pointer moves and needs several of them to pass
 * its drag threshold, so `locator.dragTo` (one move) is not enough.
 */
async function drag(page: Page, source: Locator, target: Locator): Promise<void> {
  const from = (await source.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + 10, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + 20, from.y + from.height / 2, { steps: 5 });
  await page.mouse.move(to.x + 40, to.y + to.height * 0.8, { steps: 15 });
  await page.mouse.up();
}

test.beforeEach(async ({ page }) => {
  await serveConfigs(page);
});

test('builder: drag a field, edit label, undo, redo, export JSON', async ({ page }) => {
  await page.goto('/builder');
  await expectNoA11yViolations(page);

  await drag(page, page.getByTestId('palette-number-field'), page.getByTestId('canvas-node-name'));
  await expect(page.getByTestId('canvas-node-numberField1')).toBeVisible();
  await expect(page.getByTestId('prop-id')).toHaveText('numberField1');

  const label = page.getByTestId('prop-label');
  await label.fill('Verbrauch');
  await label.press('Enter');
  await expect(page.getByTestId('preview').getByLabel('Verbrauch')).toBeVisible();
  await expect(page.getByTestId('json-view')).toContainText('"label": "Verbrauch"');

  await page.getByTestId('undo').click();
  await expect(label).toHaveValue('Neue Zahl');
  await expect(page.getByTestId('json-view')).not.toContainText('Verbrauch');

  await page.getByTestId('redo').click();
  await expect(label).toHaveValue('Verbrauch');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-json').click(),
  ]);
  expect(download.suggestedFilename()).toBe('neuer_bildschirm.json');
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  // The drop index depends on the pointer position relative to the item centre, so only content is checked.
  type ExportedNode = { id: string; type: string; props: { label: string } };
  const nodes: ExportedNode[] = exported.root.children;
  expect(nodes.map((n) => n.id).sort()).toEqual(['name', 'numberField1']);
  expect(nodes.find((n) => n.id === 'numberField1')).toMatchObject({
    type: 'number-field',
    props: { label: 'Verbrauch' },
  });

  await expectNoA11yViolations(page);
});

test('builder: import a v1 config and run it', async ({ page }) => {
  await page.goto('/builder');
  await page.getByTestId('import-json').fill(
    JSON.stringify({
      version: 1,
      id: 'importiert',
      title: 'Importiert',
      fields: [{ name: 'note', widget: 'text', label: 'Notiz' }],
    }),
  );
  await page.getByTestId('import-button').click();
  await expect(page.getByTestId('canvas-node-note')).toBeVisible();

  await page.getByTestId('run').click();
  await expect(page).toHaveURL(/\/run\/importiert$/);
  await expect(page.getByTestId('screen-title')).toHaveText('Importiert');
  await expect(page.getByTestId('field-note')).toBeVisible();
});

test('builder: invalid expression shows the error panel in the preview', async ({ page }) => {
  await page.goto('/builder');
  await page.getByTestId('select-name').click();
  await page.getByTestId('prop-visibleIf').fill('missing ==');
  await expect(page.getByText('Unexpected end of expression')).toBeVisible();
  await page.getByTestId('prop-visibleIf').press('Enter');
  await expect(page.getByTestId('preview').getByTestId('config-errors')).toBeVisible();
  await expectNoA11yViolations(page);
});
