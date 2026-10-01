import type { PostSummary } from '../types';
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const SUMMARY_MAX_LENGTH = 600;
const TAG_MAX_LENGTH = 30;
const MAX_TAGS = 8;
export function cleanUntrustedText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
export function parseSummaryResponse(data: unknown): PostSummary | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const record = data as Record<string, unknown>;
  const summary = cleanUntrustedText(record.summary, SUMMARY_MAX_LENGTH);
  if (!summary) return null;
  const seen = new Set<string>();
  const tags: string[] = [];
  if (Array.isArray(record.tags)) {
    for (const raw of record.tags) {
      const tag = cleanUntrustedText(raw, TAG_MAX_LENGTH);
      const key = tag.toLowerCase();
      if (!tag || seen.has(key)) continue;
      seen.add(key);
      tags.push(tag);
      if (tags.length >= MAX_TAGS) break;
    }
  }
  return {
    summary,
    tags,
    source: record.source === 'model' ? 'model' : 'mock',
    truncated: record.truncated === true,
  };
}