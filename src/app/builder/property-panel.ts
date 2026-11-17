import { Component, computed, inject, signal } from '@angular/core';
import { isContainerType, SelectOption, UiNode, ValidatorConfig } from '../core/config.types';
import { parse } from '../expressions';
import { BuilderStore } from './builder.store';

type ExpressionKey = 'visibleIf' | 'requiredIf' | 'computed';
type TextProp = 'label' | 'hint' | 'placeholder';

/** Returns a copy without `key` when the value is empty, so cleared fields vanish from the JSON. */
function withKey<T extends object>(
  source: T | undefined,
  key: string,
  value: unknown,
): T | undefined {
  const next: Record<string, unknown> = { ...source };
  if (value === undefined || value === '') delete next[key];
  else next[key] = value;
  return Object.keys(next).length > 0 ? (next as T) : undefined;
}

const optionsToText = (options: readonly SelectOption[] | undefined): string =>
  (options ?? []).map((o) => `${o.value}=${o.label}`).join('\n');

const textToOptions = (text: string): SelectOption[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [value, ...label] = line.split('=');
      return { value: value.trim(), label: (label.join('=') || value).trim() };
    });

/**
 * Edits the selected node. Inputs commit on `change` (blur or Enter), not on every
 * keystroke, so that one edit is one undo step.
 */
@Component({
  selector: 'mm-property-panel',
  templateUrl: './property-panel.html',
  styleUrl: './property-panel.scss',
})
export class PropertyPanel {
  protected readonly store = inject(BuilderStore);

  /** One-element list keyed by id: switching nodes recreates the inputs, so no typed text leaks across. */
  protected readonly selection = computed(() => {
    const node = this.store.selectedNode();
    return node ? [node] : [];
  });

  protected readonly expressionKeys: readonly ExpressionKey[] = [
    'visibleIf',
    'requiredIf',
    'computed',
  ];
  /** Live parse feedback while typing, before the value is committed. */
  protected readonly draftErrors = signal<Partial<Record<ExpressionKey, string>>>({});

  protected isContainer(node: UiNode): boolean {
    return isContainerType(node.type);
  }

  protected optionsText(node: UiNode): string {
    return optionsToText(node.props?.options);
  }

  protected setText(node: UiNode, key: TextProp, value: string): void {
    this.store.updateNode(node.id, { props: withKey(node.props, key, value.trim()) });
  }

  protected setOptions(node: UiNode, text: string): void {
    const options = textToOptions(text);
    this.store.updateNode(node.id, {
      props: withKey(node.props, 'options', options.length ? options : undefined),
    });
  }

  protected setRequired(node: UiNode, required: boolean): void {
    this.store.updateNode(node.id, {
      validators: withKey<ValidatorConfig>(node.validators, 'required', required || undefined),
    });
  }

  protected setNumberValidator(node: UiNode, key: 'min' | 'max', raw: string): void {
    const value = raw.trim() === '' ? undefined : Number(raw);
    if (value !== undefined && !Number.isFinite(value)) return;
    this.store.updateNode(node.id, {
      validators: withKey<ValidatorConfig>(node.validators, key, value),
    });
  }

  protected setPattern(node: UiNode, raw: string): void {
    this.store.updateNode(node.id, {
      validators: withKey<ValidatorConfig>(node.validators, 'pattern', raw.trim() || undefined),
    });
  }

  protected checkExpression(key: ExpressionKey, source: string): void {
    const result = source.trim() === '' ? null : parse(source);
    this.draftErrors.update((errors) => ({
      ...errors,
      [key]: result && !result.ok ? result.error : undefined,
    }));
  }

  protected setExpression(node: UiNode, key: ExpressionKey, source: string): void {
    this.store.updateNode(node.id, { [key]: source.trim() || undefined });
  }

  protected remove(node: UiNode): void {
    this.store.removeNode(node.id);
  }
}
