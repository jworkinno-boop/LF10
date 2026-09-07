import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { reset } from '../clock';

beforeEach(() => {
  globalThis.localStorage?.clear();
  reset();
});

afterEach(() => {
  cleanup();
});
