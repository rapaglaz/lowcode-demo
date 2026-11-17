import { Component, input, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ScreenConfig, UiNode } from '../core/config.types';
import { RENDER_MODE, RenderMode } from './render-mode';
import { ScreenRenderer } from './screen-renderer';
import { provideWidgets } from './ui-registry';

@Component({
  selector: 'mm-test-badge',
  template: '<span data-testid="custom-badge">custom</span>',
})
class TestBadge {
  readonly node = input.required<UiNode>();
}

const config = (children: UiNode[]): ScreenConfig => ({
  schemaVersion: 3,
  id: 'test',
  title: 'Test',
  root: { id: 'root', type: 'section', children },
});

const base: UiNode[] = [
  { id: 'name', type: 'text-field', props: { label: 'Name' } },
  { id: 'mystery', type: 'does-not-exist' },
  {
    id: 'box',
    type: 'section',
    props: { label: 'Box' },
    children: [{ id: 'inner', type: 'text-field', props: { label: 'Inner' } }],
  },
];

describe.each<RenderMode>(['declarative', 'imperative'])('%s renderer', (mode) => {
  async function render(children: UiNode[]) {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: RENDER_MODE, useValue: signal(mode) },
        provideWidgets({ badge: () => Promise.resolve(TestBadge) }),
      ],
    });
    const fixture = TestBed.createComponent(ScreenRenderer);
    fixture.componentRef.setInput('config', config(children));
    await stable();
    async function stable() {
      for (let i = 0; i < 6; i++) await fixture.whenStable();
    }
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, el, stable };
  }

  it('renders known widgets including nested ones', async () => {
    const { el } = await render(base);
    expect(el.querySelector('[data-testid="field-name"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="field-box-inner"]')).not.toBeNull();
  });

  it('shows the fallback widget for an unknown type', async () => {
    const { el } = await render(base);
    expect(el.querySelector('[data-testid="unknown-mystery"]')?.textContent).toContain(
      'does-not-exist',
    );
  });

  it('renders widgets registered via provideWidgets', async () => {
    const { el } = await render([{ id: 'b', type: 'badge' }]);
    expect(el.querySelector('[data-testid="custom-badge"]')).not.toBeNull();
  });

  it('keeps component instances with the same id when the config changes', async () => {
    const { fixture, el, stable } = await render(base);
    const before = el.querySelector('[data-testid="field-box-inner"]');
    const nameBefore = el.querySelector('mm-text-field');

    fixture.componentRef.setInput(
      'config',
      config([
        { id: 'added', type: 'text-field', props: { label: 'Added' } },
        { ...base[0], props: { label: 'Name (renamed)' } },
        base[1],
        base[2],
      ]),
    );
    await stable();

    expect(el.querySelector('[data-testid="field-box-inner"]')).toBe(before);
    const nameField = el.querySelector('[data-node-id="name"] mm-text-field');
    expect(nameField).toBe(nameBefore);
    expect(nameField?.textContent).toContain('Name (renamed)');
    expect(el.querySelector('[data-testid="field-added"]')).not.toBeNull();
  });

  it('replaces the instance when the type of a node changes', async () => {
    const { fixture, el, stable } = await render(base);
    fixture.componentRef.setInput('config', config([{ id: 'name', type: 'textarea-field' }]));
    await stable();
    expect(el.querySelector('mm-text-field')).toBeNull();
    expect(el.querySelector('textarea[data-testid="field-name"]')).not.toBeNull();
  });

  it('removes hidden nodes and binds values to the form', async () => {
    const { fixture, el, stable } = await render([
      { id: 'kind', type: 'text-field' },
      { id: 'extra', type: 'text-field', visibleIf: "kind == 'x'" },
    ]);
    expect(el.querySelector('[data-testid="field-extra"]')).toBeNull();

    const input = el.querySelector<HTMLInputElement>('[data-testid="field-kind"]')!;
    input.value = 'x';
    input.dispatchEvent(new Event('input'));
    await stable();

    expect(fixture.componentInstance.runtime.form().get('kind')?.value).toBe('x');
    expect(el.querySelector('[data-testid="field-extra"]')).not.toBeNull();
  });
});
