import { jest } from '@jest/globals';
import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { SummarizerService } from './summarizer.service.js';
import { GROQ_DEFAULT_API_URL, GROQ_DEFAULT_MODEL, SUMMARIZER_MAX_INPUT_CHARS } from './summarizer.constants.js';
const makeService = (values: Record<string, string> = {}) =>
  new SummarizerService({ get: (key: string) => values[key] } as unknown as ConfigService);
const MODEL_ENV = { GROQ_API_KEY: 'gsk_test', GROQ_MODEL: 'test-model' };
const title = 'NestJS backend guide';
const body =
  'NestJS makes building backend services pleasant. It gives structure to modules, providers and controllers for teams. Testing is easy too.';
const modelResponse = (content: unknown, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
describe('SummarizerService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('returns a deterministic mock summary when no api key is configured', async () => {
    const service = makeService();
    const first = await service.summarize({ title, body });
    const second = await service.summarize({ title, body });
    expect(first).toEqual(second);
    expect(first.source).toBe('mock');
    expect(first.truncated).toBe(false);
    expect(first.summary.length).toBeGreaterThan(0);
    expect(first.tags).toContain('nestjs');
  });
  it('rejects posts that are too short', async () => {
    await expect(makeService().summarize({ title, body: 'Too short.' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
  it('accepts a body of exactly the minimum length', async () => {
    const result = await makeService().summarize({ title, body: 'a'.repeat(80) });
    expect(result.truncated).toBe(false);
  });
  it('truncates very long posts and flags it', async () => {
    const result = await makeService().summarize({ title, body: 'word '.repeat(2000) });
    expect(result.truncated).toBe(true);
    expect(result.summary.length).toBeLessThanOrEqual(300);
  });
  it('sends only redacted title and body to Groq in json mode', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      modelResponse(JSON.stringify({ summary: 'A short summary.', tags: ['nestjs'] })),
    );
    await makeService(MODEL_ENV).summarize({
      title,
      body: `${body} Contact me at john@example.com or +880 1712 345678 for details.`,
    });
    expect(fetchMock.mock.calls[0][0]).toBe(GROQ_DEFAULT_API_URL);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer gsk_test');
    const sent = JSON.parse(String(init.body));
    expect(sent.model).toBe('test-model');
    expect(sent.response_format).toEqual({ type: 'json_object' });
    const userContent: string = sent.messages[1].content;
    expect(userContent).toContain('[email]');
    expect(userContent).toContain('[phone]');
    expect(userContent).not.toContain('john@example.com');
    expect(Object.keys(sent).sort()).toEqual([
      'max_completion_tokens',
      'messages',
      'model',
      'response_format',
      'temperature',
    ]);
  });
  it('uses the default Groq model when none is configured', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      modelResponse(JSON.stringify({ summary: 'A short summary.', tags: ['nestjs'] })),
    );
    await makeService({ GROQ_API_KEY: 'gsk_test' }).summarize({ title, body });
    const sent = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(sent.model).toBe(GROQ_DEFAULT_MODEL);
  });
  it('validates and normalizes model output', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      modelResponse('```json\n{"summary":"  Nice   post. ","tags":["#NestJS "," nestjs","API"]}\n```'),
    );
    const result = await makeService(MODEL_ENV).summarize({ title, body });
    expect(result).toEqual({ summary: 'Nice post.', tags: ['nestjs', 'api'], source: 'model', truncated: false });
  });
  it('maps malformed model output to a bad gateway error', async () => {
    const service = makeService(MODEL_ENV);
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(modelResponse('not json at all'));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(BadGatewayException);
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(modelResponse(JSON.stringify({ summary: 'ok' })));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(BadGatewayException);
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(modelResponse(JSON.stringify({ summary: '', tags: ['a'] })));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(BadGatewayException);
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(modelResponse(''));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(BadGatewayException);
  });
  it('maps a Groq json validation error (400) to a bad gateway error', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'json_validate_failed' } }), { status: 400 }));
    await expect(makeService(MODEL_ENV).summarize({ title, body })).rejects.toBeInstanceOf(BadGatewayException);
  });
  it('maps a rate limit (429) to a too many requests error', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'rate limit' } }), { status: 429 }));
    await expect(makeService(MODEL_ENV).summarize({ title, body })).rejects.toMatchObject({ status: 429 });
  });
  it('maps a timeout to a gateway timeout error', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    await expect(makeService(MODEL_ENV).summarize({ title, body })).rejects.toBeInstanceOf(GatewayTimeoutException);
  });
  it('maps network failures, auth errors and upstream errors to service unavailable', async () => {
    const service = makeService(MODEL_ENV);
    jest.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(ServiceUnavailableException);
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(modelResponse('x', 401));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(ServiceUnavailableException);
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(modelResponse('x', 500));
    await expect(service.summarize({ title, body })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
  it('supports simulated failures in mock mode', async () => {
    await expect(makeService({ SUMMARIZER_MOCK_FAILURE: 'timeout' }).summarize({ title, body })).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
    await expect(
      makeService({ SUMMARIZER_MOCK_FAILURE: 'unavailable' }).summarize({ title, body }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(
      makeService({ SUMMARIZER_MOCK_FAILURE: 'malformed' }).summarize({ title, body }),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });
  it('exposes the documented input limit', () => {
    expect(SUMMARIZER_MAX_INPUT_CHARS).toBe(4000);
  });
});