import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Mock } from 'vitest';

export function createTestClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
}

export function renderWithClient(ui: ReactElement, client = createTestClient()) {
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export const ok = (data: unknown) => ({ success: true as const, data });

export const fail = (message: string, statusCode = 400) => ({
  success: false as const,
  statusCode,
  message,
  errors: [] as string[],
});

export function mockApi(mock: Mock, impl: (path: string, options?: RequestInit) => unknown) {
  mock.mockImplementation(impl as never);
}
