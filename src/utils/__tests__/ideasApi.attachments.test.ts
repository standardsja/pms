import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchIdeas, fetchIdeaById } from '../ideasApi';

const originalFetch = global.fetch;

function mockFetchOnce(json: any, ok = true) {
  (global.fetch as any) = vi.fn(async () => ({ ok, json: async () => json, text: async () => JSON.stringify(json) }));
}

describe('ideasApi attachments', () => {
  beforeEach(() => {
    // @ts-ignore
    global.fetch = vi.fn();
    // minimal localStorage mock because authHeaders may access token/user
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

  it('adds include=attachments to list request and maps firstAttachmentUrl', async () => {
    const sample = [
      { id: 1, title: 'A', description: 'd', category: 'OTHER', status: 'PENDING_REVIEW', submittedBy: '1', submittedAt: '2025-01-01', voteCount: 0, viewCount: 0, attachments: [{ id: 10, fileUrl: '/uploads/a.png', fileName: 'a.png', fileSize: 100, uploadedAt: '2025-01-01' }] },
      { id: 2, title: 'B', description: 'd', category: 'OTHER', status: 'PENDING_REVIEW', submittedBy: '1', submittedAt: '2025-01-01', voteCount: 0, viewCount: 0 },
    ];
    mockFetchOnce(sample);

    const result = await fetchIdeas({ includeAttachments: true });
    expect((global.fetch as any).mock.calls[0][0]).toContain('include=attachments');
    expect(result[0].firstAttachmentUrl).toBe('/uploads/a.png');
    expect(result[1].firstAttachmentUrl).toBeNull();
  });

  it('adds include=attachments to single fetch and maps firstAttachmentUrl', async () => {
    const sample = { id: 3, title: 'C', description: 'd', category: 'OTHER', status: 'PENDING_REVIEW', submittedBy: '1', submittedAt: '2025-01-01', voteCount: 0, viewCount: 0, attachments: [{ id: 11, fileUrl: '/uploads/c.png', fileName: 'c.png', fileSize: 100, uploadedAt: '2025-01-01' }] };
    mockFetchOnce(sample);

    const idea = await fetchIdeaById(3, { includeAttachments: true });
    expect((global.fetch as any).mock.calls[0][0]).toContain('include=attachments');
    expect(idea.firstAttachmentUrl).toBe('/uploads/c.png');
  });
});
