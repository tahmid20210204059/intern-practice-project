import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { SummaryResultDto } from './dto/summary-result.dto.js';
import {
  GROQ_DEFAULT_API_URL,
  GROQ_DEFAULT_MODEL,
  GROQ_MAX_COMPLETION_TOKENS,
  MALFORMED_MESSAGE,
  RATE_LIMIT_MESSAGE,
  SUMMARIZER_DEFAULT_TIMEOUT_MS,
  SUMMARIZER_MAX_INPUT_CHARS,
  SUMMARIZER_MIN_INPUT_CHARS,
  SUMMARIZER_SYSTEM_PROMPT,
  SUMMARY_MAX_LENGTH,
  TIMEOUT_MESSAGE,
  UNAVAILABLE_MESSAGE,
} from './summarizer.constants.js';
import type { MockFailureMode, ModelConfig, SummarizeInput, SummarizeResult } from './summarizer.types.js';
import {
  buildMockSummary,
  buildMockTags,
  clampText,
  normalizeTags,
  redactSensitive,
  sanitizeText,
  stripCodeFences,
  stripPostDelimiters,
} from './summarizer.utils.js';
@Injectable()
export class SummarizerService {
  private readonly logger = new Logger(SummarizerService.name);
  constructor(private configService: ConfigService) {}
  async summarize(input: SummarizeInput): Promise<SummarizeResult> {
    const title = redactSensitive(sanitizeText(input.title)).trim();
    const fullBody = redactSensitive(sanitizeText(input.body)).trim();
    if (fullBody.length < SUMMARIZER_MIN_INPUT_CHARS) {
      throw new UnprocessableEntityException(
        `This post is too short to summarize. It needs at least ${SUMMARIZER_MIN_INPUT_CHARS} characters of body text.`,
      );
    }
    const truncated = fullBody.length > SUMMARIZER_MAX_INPUT_CHARS;
    const body = truncated ? fullBody.slice(0, SUMMARIZER_MAX_INPUT_CHARS) : fullBody;
    const config = this.readModelConfig();
    const raw = config ? await this.callModel(config, title, body) : this.runMock(title, body);
    const parsed = this.parseOutput(raw);
    return { ...parsed, source: config ? 'model' : 'mock', truncated };
  }
  private readModelConfig(): ModelConfig | null {
    const apiKey = this.configService.get<string>('GROQ_API_KEY')?.trim();
    if (!apiKey) return null;
    const url = this.configService.get<string>('GROQ_API_URL')?.trim() || GROQ_DEFAULT_API_URL;
    const model = this.configService.get<string>('GROQ_MODEL')?.trim() || GROQ_DEFAULT_MODEL;
    const timeout = Number(this.configService.get<string>('SUMMARIZER_TIMEOUT_MS'));
    return {
      url,
      apiKey,
      model,
      timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : SUMMARIZER_DEFAULT_TIMEOUT_MS,
    };
  }
  private readMockFailure(): MockFailureMode | null {
    const value = this.configService.get<string>('SUMMARIZER_MOCK_FAILURE')?.trim().toLowerCase();
    if (value === 'timeout' || value === 'malformed' || value === 'unavailable') return value;
    return null;
  }
  private runMock(title: string, body: string): string {
    const failure = this.readMockFailure();
    if (failure === 'timeout') throw new GatewayTimeoutException(TIMEOUT_MESSAGE);
    if (failure === 'unavailable') throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    if (failure === 'malformed') return '{"summary": ';
    return JSON.stringify({ summary: buildMockSummary(body), tags: buildMockTags(title, body) });
  }
  private async callModel(config: ModelConfig, title: string, body: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          max_completion_tokens: GROQ_MAX_COMPLETION_TOKENS,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: SUMMARIZER_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `<post>\nTitle: ${stripPostDelimiters(title)}\n\n${stripPostDelimiters(body)}\n</post>`,
            },
          ],
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw await this.mapUpstreamError(res);
      const payload = await res.text();
      let json: any;
      try {
        json = JSON.parse(payload);
      } catch {
        throw new BadGatewayException(MALFORMED_MESSAGE);
      }
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) throw new BadGatewayException(MALFORMED_MESSAGE);
      return content;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        throw new GatewayTimeoutException(TIMEOUT_MESSAGE);
      }
      this.logger.warn(`Summarizer request failed: ${err instanceof Error ? err.message : 'unknown error'}`);
      throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
    } finally {
      clearTimeout(timer);
    }
  }
  private async mapUpstreamError(res: Response): Promise<HttpException> {
    const detail = await this.readUpstreamError(res);
    this.logger.warn(`Groq responded with status ${res.status}${detail ? `: ${detail}` : ''}`);
    if (res.status === 429) return new HttpException(RATE_LIMIT_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    if (res.status === 400) return new BadGatewayException(MALFORMED_MESSAGE);
    return new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }
  private async readUpstreamError(res: Response): Promise<string> {
    try {
      const text = await res.text();
      const message = JSON.parse(text)?.error?.message;
      return (typeof message === 'string' ? message : text).slice(0, 200);
    } catch {
      return '';
    }
  }
  private parseOutput(raw: string): { summary: string; tags: string[] } {
    let data: unknown;
    try {
      data = JSON.parse(stripCodeFences(raw));
    } catch {
      throw new BadGatewayException(MALFORMED_MESSAGE);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new BadGatewayException(MALFORMED_MESSAGE);
    const { summary, tags } = data as Record<string, unknown>;
    if (typeof summary !== 'string' || !Array.isArray(tags) || tags.some((tag) => typeof tag !== 'string')) {
      throw new BadGatewayException(MALFORMED_MESSAGE);
    }
    const dto = plainToInstance(SummaryResultDto, {
      summary: clampText(sanitizeText(summary).replace(/\s+/g, ' ').trim(), SUMMARY_MAX_LENGTH),
      tags: normalizeTags(tags as string[]),
    });
    if (validateSync(dto).length > 0) throw new BadGatewayException(MALFORMED_MESSAGE);
    return { summary: dto.summary, tags: dto.tags };
  }
}