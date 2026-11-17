import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { UiNode } from '../core/config.types';
import { buildForm, createListItem, validatorsFor } from './form-builder';
import { FormRuntime } from './form-runtime';
import { evaluateRules } from './rule-engine';

const root: UiNode = {
  id: 'root',
  type: 'section',
  children: [
    {
      id: 'meter',
      type: 'text-field',
      validators: { required: true, pattern: '^[0-9]{3}$' },
    },
    {
      id: 'kind',
      type: 'select-field',
      props: { defaultValue: 'kunde', options: [{ value: 'kunde', label: 'Kunde' }] },
    },
    { id: 'photo', type: 'upload-field', visibleIf: "kind == 'monteur'" },
    { id: 'current', type: 'number-field', props: { defaultValue: 100 } },
    { id: 'next', type: 'number-field', validators: { min: 0, max: 1000 } },
    { id: 'diff', type: 'number-field', computed: 'next - current' },
    { id: 'reason', type: 'textarea-field', requiredIf: 'diff > 50' },
    {
      id: 'details',
      type: 'section',
      children: [{ id: 'note', type: 'text-field' }],
    },
    {
      id: 'contacts',
      type: 'repeat-list',
      props: { minItems: 2 },
      children: [
        { id: 'channel', type: 'text-field' },
        { id: 'callback', type: 'date-field', visibleIf: "item.channel == 'phone'" },
      ],
    },
  ],
};

describe('buildForm', () => {
  it('maps the config tree to FormGroup / FormArray / FormControl', () => {
    const form = buildForm(root);
    expect(form.get('meter')).toBeInstanceOf(FormControl);
    expect(form.get('details')).toBeInstanceOf(FormGroup);
    expect(form.get('details.note')).toBeInstanceOf(FormControl);
    expect(form.get('contacts')).toBeInstanceOf(FormArray);
    expect((form.get('contacts') as FormArray).length).toBe(2);
    expect(form.get('contacts.1.callback')).toBeInstanceOf(FormControl);
  });

  it('uses default values', () => {
    const form = buildForm(root);
    expect(form.get('kind')?.value).toBe('kunde');
    expect(form.get('next')?.value).toBeNull();
  });

  it.each<[string, unknown, boolean]>([
    ['meter', null, false],
    ['meter', '12a', false],
    ['meter', '123', true],
    ['next', -1, false],
    ['next', 1001, false],
    ['next', 1000, true],
  ])('validates %s = %j as valid: %s', (path, value, valid) => {
    const control = buildForm(root).get(path)!;
    control.setValue(value);
    expect(control.valid).toBe(valid);
  });

  it('maps every static validator', () => {
    const node: UiNode = {
      id: 'x',
      type: 'text-field',
      validators: { required: true, min: 1, max: 2, pattern: 'a' },
    };
    expect(validatorsFor(node)).toHaveLength(4);
    expect(validatorsFor(node)).toContain(Validators.required);
  });

  it('creates independent list items from the item template', () => {
    const list = root.children!.find((n) => n.id === 'contacts')!;
    const a = createListItem(list);
    const b = createListItem(list);
    a.get('channel')?.setValue('mail');
    expect(b.get('channel')?.value).toBeNull();
  });
});

describe('evaluateRules', () => {
  const value = (overrides: Record<string, unknown>) => ({
    ...buildForm(root).getRawValue(),
    ...overrides,
  });

  it('evaluates visibility including list items', () => {
    const snapshot = evaluateRules(
      root,
      value({
        kind: 'monteur',
        contacts: [
          { channel: 'phone', callback: null },
          { channel: 'mail', callback: null },
        ],
      }),
    );
    expect(snapshot.get('photo')?.visible).toBe(true);
    expect(snapshot.get('contacts.0.callback')?.visible).toBe(true);
    expect(snapshot.get('contacts.1.callback')?.visible).toBe(false);
  });

  it('feeds computed values into later expressions', () => {
    const snapshot = evaluateRules(root, value({ next: 200 }));
    expect(snapshot.get('diff')?.computedValue).toBe(100);
    expect(snapshot.get('reason')?.required).toBe(true);
  });

  it('turns evaluation errors into state instead of exceptions', () => {
    const snapshot = evaluateRules(root, value({ next: null }));
    expect(snapshot.get('diff')).toEqual({
      visible: true,
      required: false,
      computedValue: null,
      errors: ["computed: Operator '-' needs numbers, got null and number"],
    });
    expect(snapshot.get('reason')?.required).toBe(false);
  });

  it('hides children of a hidden parent', () => {
    const tree: UiNode = {
      id: 'root',
      type: 'section',
      children: [
        { id: 'flag', type: 'text-field' },
        {
          id: 'box',
          type: 'section',
          visibleIf: "flag == 'y'",
          children: [{ id: 'inner', type: 'text-field', validators: { required: true } }],
        },
      ],
    };
    const snapshot = evaluateRules(tree, { flag: 'n', box: { inner: null } });
    expect(snapshot.get('box.inner')).toEqual({ visible: false, required: false, errors: [] });
  });
});

describe('FormRuntime', () => {
  function setup() {
    const injector = TestBed.inject(Injector);
    const runtime = runInInjectionContext(injector, () => new FormRuntime(signal(root)));
    TestBed.tick();
    return { runtime, form: runtime.form() };
  }

  it('disables hidden controls and enables them when they become visible', () => {
    const { form } = setup();
    expect(form.get('photo')?.disabled).toBe(true);
    form.get('kind')?.setValue('monteur');
    TestBed.tick();
    expect(form.get('photo')?.enabled).toBe(true);
  });

  it('writes computed values into the control', () => {
    const { form } = setup();
    form.get('next')?.setValue(130);
    TestBed.tick();
    expect(form.get('diff')?.value).toBe(30);
  });

  it('adds and removes the required validator for requiredIf', () => {
    const { form } = setup();
    const reason = form.get('reason')!;
    expect(reason.hasValidator(Validators.required)).toBe(false);
    expect(reason.valid).toBe(true);

    form.get('next')?.setValue(200);
    TestBed.tick();
    expect(reason.hasValidator(Validators.required)).toBe(true);
    expect(reason.valid).toBe(false);

    form.get('next')?.setValue(110);
    TestBed.tick();
    expect(reason.hasValidator(Validators.required)).toBe(false);
    expect(reason.valid).toBe(true);
  });

  it('applies rules to list items added later', () => {
    const { runtime, form } = setup();
    const list = form.get('contacts') as FormArray;
    list.push(createListItem(root.children!.find((n) => n.id === 'contacts')!));
    form.get('contacts.2.channel')?.setValue('phone');
    TestBed.tick();
    expect(runtime.rules().get('contacts.2.callback')?.visible).toBe(true);
    expect(form.get('contacts.2.callback')?.enabled).toBe(true);
    expect(form.get('contacts.0.callback')?.disabled).toBe(true);
  });
});
