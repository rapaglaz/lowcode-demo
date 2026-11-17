import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SignalFormsPage } from './signal-forms-page';

describe('SignalFormsPage', () => {
  async function setup() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SignalFormsPage);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const byId = <T extends HTMLElement>(id: string) =>
      el.querySelector<T>(`[data-testid="${id}"]`);
    const type = async (id: string, value: string) => {
      const input = byId<HTMLInputElement>(id)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      byId<HTMLButtonElement>('sf-save')!.click();
      for (let i = 0; i < 3; i++) await fixture.whenStable();
    };
    return { el, byId, type, submit };
  }

  it('computes the difference and requires a reason above 50 EUR', async () => {
    const { byId, type, submit } = await setup();
    await type('sf-customerNumber', '12345678');
    await type('sf-newInstalment', '200');
    expect(byId<HTMLInputElement>('sf-difference')?.value).toBe('115');

    await submit();
    expect(byId('sf-error-reason')?.textContent).toContain('Bitte füllen Sie dieses Feld aus.');
    expect(byId('sf-status')?.textContent?.trim()).toBe('');

    await type('sf-reason', 'Neue Wärmepumpe');
    await submit();
    expect(byId('sf-status')?.textContent).toContain('Gespeichert.');
  });

  it('does not require a reason for small changes', async () => {
    const { byId, type, submit } = await setup();
    await type('sf-customerNumber', '12345678');
    await type('sf-newInstalment', '90');
    await submit();
    expect(byId('sf-error-reason')).toBeNull();
    expect(byId('sf-status')?.textContent).toContain('Gespeichert.');
  });

  it('shows pattern errors after submit', async () => {
    const { byId, type, submit } = await setup();
    await type('sf-customerNumber', '12');
    await submit();
    expect(byId('sf-error-customerNumber')?.textContent).toContain('acht Ziffern');
  });
});
