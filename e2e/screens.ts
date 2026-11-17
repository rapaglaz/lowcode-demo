import { Step } from './support';

/**
 * Data-driven description of each sample screen. `screens.spec.ts` generates
 * one test per entry, so a new config only needs a new entry here.
 */
export type ScreenScenario = {
  readonly id: string;
  readonly title: string;
  /** Field test ids (without `field-`) that must show an error after an empty save. */
  readonly requiredFields: readonly string[];
  /** A conditional field: hidden at first, shown after `show`, hidden again after `hide`. */
  readonly conditional: readonly {
    readonly testId: string;
    readonly show: readonly Step[];
    readonly hide: readonly Step[];
  }[];
  /** Steps that produce a valid form. */
  readonly validSteps: readonly Step[];
  /** Text that must appear in the saved payload. */
  readonly payloadContains: readonly string[];
};

export const SCREENS: readonly ScreenScenario[] = [
  {
    id: 'zaehlerstand',
    title: 'Zählerstand erfassen',
    requiredFields: ['meterNumber', 'readingType', 'readingDate', 'reading'],
    conditional: [
      {
        testId: 'field-photo',
        show: [{ select: 'field-readingType', value: 'Monteur' }],
        hide: [{ select: 'field-readingType', value: 'Kunde' }],
      },
    ],
    validSteps: [
      { fill: 'field-meterNumber', value: 'EMH12345678' },
      { select: 'field-readingType', value: 'Monteur' },
      { upload: 'field-photo', fileName: 'zaehler.jpg' },
      { fill: 'field-readingDate', value: '2026-11-17' },
      { fill: 'field-reading', value: '12345' },
    ],
    payloadContains: ['"meterNumber": "EMH12345678"', '"name": "zaehler.jpg"', '"reading": 12345'],
  },
  {
    id: 'abschlag',
    title: 'Abschlag ändern',
    requiredFields: ['customerNumber', 'newInstalment'],
    conditional: [],
    validSteps: [
      { fill: 'field-customerNumber', value: '12345678' },
      { fill: 'field-newInstalment', value: '200' },
      { fill: 'field-reason', value: 'Neue Wärmepumpe' },
    ],
    payloadContains: ['"newInstalment": 200', '"difference": 115', '"reason": "Neue Wärmepumpe"'],
  },
  {
    id: 'beschwerde',
    title: 'Beschwerde erfassen',
    requiredFields: [
      'customer-customerNumber',
      'customer-name',
      'complaint-category',
      'complaint-description',
      'contactAttempts-0-channel',
      'contactAttempts-0-contactDate',
    ],
    conditional: [
      {
        testId: 'section-escalation',
        show: [{ select: 'field-complaint-priority', value: 'hoch' }],
        hide: [{ select: 'field-complaint-priority', value: 'mittel' }],
      },
      {
        testId: 'field-contactAttempts-0-callbackDate',
        show: [{ select: 'field-contactAttempts-0-result', value: 'rueckruf' }],
        hide: [{ select: 'field-contactAttempts-0-result', value: 'erreicht' }],
      },
    ],
    validSteps: [
      { fill: 'field-customer-customerNumber', value: '87654321' },
      { fill: 'field-customer-name', value: 'Erika Mustermann' },
      { select: 'field-complaint-category', value: 'abrechnung' },
      { select: 'field-complaint-priority', value: 'hoch' },
      { fill: 'field-complaint-description', value: 'Rechnung doppelt erhalten.' },
      { select: 'field-contactAttempts-0-channel', value: 'telefon' },
      { fill: 'field-contactAttempts-0-contactDate', value: '2026-11-10' },
      { select: 'field-contactAttempts-0-result', value: 'rueckruf' },
      { fill: 'field-contactAttempts-0-callbackDate', value: '2026-11-20' },
      { click: 'add-contactAttempts' },
      { select: 'field-contactAttempts-1-channel', value: 'email' },
      { fill: 'field-contactAttempts-1-contactDate', value: '2026-11-12' },
      { select: 'field-escalation-team', value: 'teamleitung' },
      { fill: 'field-escalation-justification', value: 'Wiederholter Fehler.' },
    ],
    payloadContains: [
      '"callbackDate": "2026-11-20"',
      '"channel": "email"',
      '"team": "teamleitung"',
    ],
  },
];
