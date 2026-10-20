import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { eventDate, slug, weddingFields, guestFields, normalizeSections } = require('../lib/validators');

describe('eventDate', () => {
  it.each([null, ''])('accepts empty value %s as null', value => {
    expect(eventDate(value)).toBeNull();
  });

  it.each([
    '2026-04-03',
    '2026-04-03 10:00',
    '2026-04-03T10:00',
    '2026-04-03T10:00:00+07:00',
    '2026-04-03T10:00:00.000Z'
  ])('accepts %s', value => {
    expect(eventDate(value)).toBeInstanceOf(Date);
  });

  it.each(['03/04/2026', '2026-99-03', '2026-04-03oops', 123, undefined])('rejects %s', value => {
    expect(() => eventDate(value)).toThrow('Ngày không hợp lệ');
  });
});

describe('field validation', () => {
  it('normalizes a valid slug', () => expect(slug('My-Wedding')).toBe('my-wedding'));
  it('rejects a short slug', () => expect(() => slug('x')).toThrow());
  it('rejects an http image URL', () => expect(() => weddingFields.coverImage('http://example.com')).toThrow());
  it('rejects an invalid color', () => expect(() => weddingFields.theme({ primary: 'red' })).toThrow());
  it('rejects guestCount 21', () => expect(() => guestFields.guestCount(21)).toThrow());
  it('accepts guestCount 0', () => expect(guestFields.guestCount(0)).toBe(0));
});

describe('normalizeSections', () => {
  it('keeps a known section once', () => {
    const result = normalizeSections([
      { key: 'story', enabled: true }, { key: 'story', enabled: false }
    ], []);
    expect(result.filter(section => section.key === 'story')).toEqual([{ key: 'story', enabled: true }]);
  });

  it('drops unknown sections', () => {
    const result = normalizeSections([{ key: 'missing', enabled: true }], []);
    expect(result.some(section => section.key === 'missing')).toBe(false);
  });

  it('adds omitted built in sections disabled', () => {
    const result = normalizeSections([], []);
    expect(result.find(section => section.key === 'rsvp').enabled).toBe(false);
  });

  it('adds custom sections enabled', () => {
    const result = normalizeSections([], [{ id: 'extra' }]);
    expect(result.find(section => section.key === 'custom:extra').enabled).toBe(true);
  });
});
