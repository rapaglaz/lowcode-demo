import { computed, signal, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { isContainerType, UiNode } from '../core/config.types';
import { FORM_RUNTIME, FormRuntime } from '../renderer/form-runtime';
import { DEFAULT_RULE_STATE, NODE_CONTEXT, NodeContext } from '../renderer/node-context';
import { DEFAULT_WIDGETS, UNKNOWN_WIDGET } from '../renderer/ui-registry';

/**
 * Contract suite: it runs for every widget in the registry. Value widgets must
 * be ControlValueAccessors; a new field widget without a sample fails here, so
 * the contract cannot be skipped by accident.
 */
type NativeControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

type ContractSample = {
  /** Model value for `writeValue` and the text the DOM must show for it. */
  readonly write: unknown;
  readonly shown: string;
  /** Simulates user input and returns the value `onChange` must receive. */
  readonly input: (element: NativeControl) => unknown;
};

const typeInto =
  (text: string, expected: unknown, eventName = 'input') =>
  (element: NativeControl): unknown => {
    element.value = text;
    element.dispatchEvent(new Event(eventName));
    return expected;
  };

const SAMPLES: Readonly<Record<string, ContractSample>> = {
  'text-field': { write: 'abc', shown: 'abc', input: typeInto('xyz', 'xyz') },
  'textarea-field': { write: 'line', shown: 'line', input: typeInto('more', 'more') },
  'number-field': { write: 42, shown: '42', input: typeInto('7.5', 7.5) },
  'date-field': {
    write: '2026-01-31',
    shown: '2026-01-31',
    input: typeInto('2026-02-01', '2026-02-01'),
  },
  'select-field': { write: 'b', shown: 'b', input: typeInto('a', 'a', 'change') },
  'upload-field': {
    write: { name: 'meter.jpg', size: 2048, type: 'image/jpeg' },
    shown: '',
    input: (element) => {
      const file = new File(['x'.repeat(10)], 'photo.png', { type: 'image/png' });
      Object.defineProperty(element, 'files', { value: { item: () => file, length: 1 } });
      element.dispatchEvent(new Event('change'));
      return { name: 'photo.png', size: 10, type: 'image/png' };
    },
  },
};

const nodeFor = (type: string): UiNode => ({
  id: 'probe',
  type,
  props: {
    label: 'Probe label',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  },
  ...(isContainerType(type) ? { children: [{ id: 'inner', type: 'text-field' }] } : {}),
});

const context: NodeContext = {
  path: signal('probe'),
  readOnly: signal(false),
  control: signal(null),
  state: computed(() => DEFAULT_RULE_STATE),
};

async function render(type: string): Promise<ComponentFixture<unknown>> {
  const component: Type<unknown> = await DEFAULT_WIDGETS[type]();
  // Containers render children, which read the rule state from the runtime.
  const runtime = { rules: signal(new Map()) } as unknown as FormRuntime;
  TestBed.configureTestingModule({
    providers: [
      { provide: NODE_CONTEXT, useValue: context },
      { provide: FORM_RUNTIME, useValue: runtime },
    ],
  });
  const fixture = TestBed.createComponent(component);
  fixture.componentRef.setInput('node', nodeFor(type));
  await fixture.whenStable();
  return fixture;
}

const valueWidgetTypes = Object.keys(DEFAULT_WIDGETS).filter(
  (type) => !isContainerType(type) && type !== UNKNOWN_WIDGET,
);

describe('widget contract', () => {
  it('covers every registered value widget with a sample', () => {
    expect(valueWidgetTypes.filter((type) => !SAMPLES[type])).toEqual([]);
  });

  describe.each(Object.keys(DEFAULT_WIDGETS))('%s', (type) => {
    it('renders without errors', async () => {
      const fixture = await render(type);
      expect((fixture.nativeElement as HTMLElement).textContent?.trim().length).toBeGreaterThan(0);
    });
  });

  describe.each(valueWidgetTypes)('%s as ControlValueAccessor', (type) => {
    let fixture: ComponentFixture<unknown>;
    let accessor: ControlValueAccessor;
    let element: NativeControl;
    const sample = (): ContractSample => SAMPLES[type];

    beforeEach(async () => {
      fixture = await render(type);
      const accessors = fixture.debugElement.injector.get(NG_VALUE_ACCESSOR, null, { self: true });
      expect(accessors, 'widget must provide NG_VALUE_ACCESSOR').not.toBeNull();
      accessor = accessors![0];
      element = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="field-probe"]',
      )!;
    });

    it('is its own value accessor (useExisting)', () => {
      expect(accessor).toBe(fixture.componentInstance);
    });

    it('pairs the label with the control via for/id', () => {
      const label = (fixture.nativeElement as HTMLElement).querySelector('label');
      expect(element).not.toBeNull();
      expect(label?.htmlFor).toBe(element.id);
      expect(label?.textContent).toContain('Probe label');
    });

    it('writeValue updates the view', async () => {
      accessor.writeValue(sample().write);
      await fixture.whenStable();
      if (element instanceof HTMLInputElement && element.type === 'file') {
        expect(fixture.nativeElement.textContent).toContain('meter.jpg');
      } else {
        expect(element.value).toBe(sample().shown);
      }
    });

    it('calls onChange on user input', () => {
      const onChange = vi.fn();
      accessor.registerOnChange(onChange);
      const expected = sample().input(element);
      expect(onChange).toHaveBeenCalledWith(expected);
    });

    it('calls onTouched on blur', () => {
      const onTouched = vi.fn();
      accessor.registerOnTouched(onTouched);
      element.dispatchEvent(new Event('blur'));
      expect(onTouched).toHaveBeenCalled();
    });

    it('setDisabledState disables the native control', async () => {
      accessor.setDisabledState?.(true);
      await fixture.whenStable();
      expect(element.disabled).toBe(true);
      accessor.setDisabledState?.(false);
      await fixture.whenStable();
      expect(element.disabled).toBe(false);
    });
  });
});
