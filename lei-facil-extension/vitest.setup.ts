import '@testing-library/jest-dom';
import { vi } from 'vitest';

global.chrome = {
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
  action: {
    openPopup: vi.fn(),
  },
} as any;
