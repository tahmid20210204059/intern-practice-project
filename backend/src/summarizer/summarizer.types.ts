export type SummarySource = 'mock' | 'model';
export interface SummarizeInput {
  title: string;
  body: string;
}
export interface SummarizeResult {
  summary: string;
  tags: string[];
  source: SummarySource;
  truncated: boolean;
}
export interface ModelConfig {
  url: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}
export type MockFailureMode = 'timeout' | 'malformed' | 'unavailable';