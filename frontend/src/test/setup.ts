import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

if (typeof AbortSignal.timeout !== 'function') {
  Object.defineProperty(AbortSignal, 'timeout', { value: () => new AbortController().signal, configurable: true });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});
