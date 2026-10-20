import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cldUrl } from '../lib/images';
import { inviteLink } from '../lib/links';
import { addCustomSection, moveSection, removeCustomSection, toggleSection } from '../lib/sections';
import { csvCell, guestsCsv } from '../lib/csv';
import { parseBulkGuests } from '../lib/guests';
import { api, ApiError, setToken } from '../lib/api';
import type { Guest, Section } from '../lib/types';
describe('data helpers', () => {
  it('transforms only Cloudinary upload URLs', () => {
    expect(cldUrl('https://res.cloudinary.com/demo/image/upload/v1/a.jpg', 640)).toBe('https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_640/v1/a.jpg');
    expect(cldUrl('https://example.com/a.jpg', 640)).toBe('https://example.com/a.jpg');
  });
  it('builds both invitation link forms', () => {
    expect(inviteLink('https://site.test/', 'le-cuoi')).toBe('https://site.test/w/le-cuoi');
    expect(inviteLink('https://site.test', 'le-cuoi', 'abc123')).toBe('https://site.test/w/le-cuoi/abc123');
  });
  it('toggles, moves, adds and removes sections without mutating inputs', () => {
    const sections: Section[] = [{ key: 'story', enabled: true }, { key: 'gallery', enabled: false }];
    expect(toggleSection(sections, 'story')[0].enabled).toBe(false);
    expect(moveSection(sections, 0, 1)[0].key).toBe('gallery');
    expect(sections[0].key).toBe('story');
    const added = addCustomSection(sections, [], { id: 'x', title: 'T', body: '', image: '' });
    expect(added.sections[2].key).toBe('custom:x');
    expect(removeCustomSection(added.sections, added.customSections, 'x')).toEqual({ sections, customSections: [] });
  });
  it('quotes CSV cells and adds a BOM for Excel', () => {
    expect(csvCell('A,"B"\nC')).toBe('"A,""B""\nC"');
    const guest = { invitationName: 'Anh, Bình', name: 'Bình', code: '123', status: 'yes' } as Guest;
    expect(guestsCsv([guest], 'https://site.test', 'cuoi')).toMatch(/^\uFEFFTên trên thiệp/);
    expect(guestsCsv([guest], 'https://site.test', 'cuoi')).toContain('"Anh, Bình"');
  });
  it('parses optional bulk guest columns', () => {
    expect(parseBulkGuests(' A | B | 090\nC\n | Empty')).toEqual([{ invitationName: 'A', name: 'B', phone: '090' }, { invitationName: 'C' }]);
  });
});
describe('API client', () => {
  beforeEach(() => {
    setToken(null);
    vi.restoreAllMocks();
  });
  it('sends bearer token and JSON', async () => {
    setToken('secret');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: '1' }) } as Response);
    await api('/weddings', { method: 'POST', body: '{}' }, true);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/weddings');
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer secret');
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
  });
  it('throws API message and clears token on authenticated 401', async () => {
    setToken('secret');
    const event = vi.fn();
    window.addEventListener('wi:unauthorized', event);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 401, json: async () => ({ message: 'Hết phiên' }) } as Response);
    await expect(api('/weddings', {}, true)).rejects.toEqual(new ApiError(401, 'Hết phiên'));
    expect(localStorage.getItem('wi_token')).toBeNull();
    expect(event).toHaveBeenCalledOnce();
    window.removeEventListener('wi:unauthorized', event);
  });
});
