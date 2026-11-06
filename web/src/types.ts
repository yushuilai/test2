export type Tone = 'ok' | 'bad' | 'na' | 'pill' | null;

export interface FieldValue {
  text: string;
  tone: Tone;
}

export type FieldMap = Record<string, FieldValue>;
