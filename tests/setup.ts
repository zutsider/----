import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  if (typeof document !== 'undefined') {
    document.body.className = '';
    document.documentElement.removeAttribute('data-theme');
  }
  vi.restoreAllMocks();
});
