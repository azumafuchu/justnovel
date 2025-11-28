
export interface Segment {
  id: string;
  text: string;
  isChapterHeader: boolean;
  status: 'pending' | 'translating' | 'processing' | 'done' | 'error';
  enText?: string;
  vocabResult?: VocabResult;
}

export interface Chapter {
  title: string;
  segments: Segment[];
  isTranslated: boolean;
}

export interface VocabWord {
  w: string;
  l: number | string;
  cm: string;
  def: string;
}

export interface VocabResult {
  id: string;
  vocab: VocabWord[];
}

export type Language = 'en' | 'zh_cn' | 'zh_tw';

export interface AppSettings {
  language: Language;
  apiMode: 'openai' | 'gemini';
  baseUrl: string;
  apiKey: string;
  model: string;
  fontFamily: string;
  customFontUrl: string;
}

export interface VocabStats {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
  6: number;
}

export type VocabSet = Set<string>;
export type VocabDB = Record<number, VocabSet>;

export interface TargetWord {
  word: string;
  level: number;
}
