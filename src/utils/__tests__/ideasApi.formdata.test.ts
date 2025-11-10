import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { submitIdea } from '../ideasApi';

const originalFetch = global.fetch;

describe('ideasApi submitIdea with image', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ id: 1, title: 'x' }) }));
    // @ts-ignore
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    } as any;
  });
  afterEach(() => {
    // @ts-ignore
    global.fetch = originalFetch;
  });

  it('sends multipart form-data when image provided', async () => {
    const data = {
      title: 'Test',
      description: 'desc',
      category: 'OTHER',
    };
    const file = new File(['abc'], 'photo.png', { type: 'image/png' });

    const result = await submitIdea(data, { image: file });
    expect(result).toBeTruthy();

    const call = (global.fetch as any).mock.calls[0];
    expect(call[0]).toBe('/api/ideas');
    expect(call[1].method).toBe('POST');
    // Body should be FormData
    expect(call[1].body instanceof FormData).toBe(true);
  });
});
