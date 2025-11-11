import { describe, it, expect } from 'vitest';
import { getStatusBadge, STATUS_BADGES } from '../statusBadges';

describe('statusBadges', () => {
  it('returns matching badge for exact status', () => {
    const badge = getStatusBadge('Approved');
    expect(badge).toEqual(STATUS_BADGES['Approved']);
  });

  it('normalizes status before lookup (case-insensitive)', () => {
    const badge = getStatusBadge('pending finance');
    expect(badge).toEqual(STATUS_BADGES['Pending Finance']);
  });

  it('falls back to default with normalized label for unknown status', () => {
    const badge = getStatusBadge('custom state');
    expect(badge.bg).toBe(STATUS_BADGES['default'].bg);
    expect(badge.text).toBe(STATUS_BADGES['default'].text);
    expect(badge.label).toBe('Custom State');
  });
});
