import {
  MAX_SUMMARY_TAGS,
  MAX_TAG_LENGTH,
  MOCK_MIN_TAG_LENGTH,
  MOCK_STOPWORDS,
  MOCK_SUMMARY_MAX_LENGTH,
  MOCK_TAG_COUNT,
} from './summarizer.constants.js';
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /(?<!\w)\+?\d[\d\s().-]{7,}\d(?!\w)/g;
const POST_TAG_REGEX = /<\/?post>/gi;
export function sanitizeText(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(CONTROL_CHARS, '');
}
export function redactSensitive(value: string): string {
  return value
    .replace(EMAIL_REGEX, '[email]')
    .replace(PHONE_REGEX, (match) => (match.replace(/\D/g, '').length >= 9 ? '[phone]' : match));
}
export function stripPostDelimiters(value: string): string {
  return value.replace(POST_TAG_REGEX, '');
}
export function stripCodeFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
}
export function clampText(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 3).trimEnd()}...`;
}
export function normalizeTags(tags: string[]): string[] {
  const unique = new Set<string>();
  for (const tag of tags) {
    const cleaned = sanitizeText(tag).trim().replace(/^#+/, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (cleaned && cleaned.length <= MAX_TAG_LENGTH) unique.add(cleaned);
  }
  return [...unique].slice(0, MAX_SUMMARY_TAGS);
}
export function buildMockSummary(body: string): string {
  const text = body.replace(/\s+/g, ' ').trim();
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return clampText(sentences.slice(0, 2).join(' '), MOCK_SUMMARY_MAX_LENGTH);
}
export function buildMockTags(title: string, body: string): string[] {
  const counts = new Map<string, number>();
  const add = (text: string, weight: number) => {
    for (const token of text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      if (token.length < MOCK_MIN_TAG_LENGTH || token.length > MAX_TAG_LENGTH) continue;
      if (MOCK_STOPWORDS.has(token) || /^\d+$/.test(token)) continue;
      counts.set(token, (counts.get(token) ?? 0) + weight);
    }
  };
  add(title, 3);
  add(body, 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(0, MOCK_TAG_COUNT)
    .map(([word]) => word);
}