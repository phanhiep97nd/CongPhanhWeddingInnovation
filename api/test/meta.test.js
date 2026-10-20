import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildMeta } = require('../lib/meta');
const base = {
  slug: 'minh-lan',
  couple: { groom: 'Minh', bride: 'Lan' },
  eventDate: new Date('2026-04-03T00:00:00Z'),
  eventTime: '18:30',
  venue: { name: 'Nhà hàng Sen', address: '12 Nguyễn Huệ' }
};

afterEach(() => {
  delete process.env.BRAND_NAME;
});

describe('buildMeta', () => {
  it('includes every wedding fact for a guest', () => {
    const result = buildMeta(base, 'Anh An', { code: 'abc123', siteOrigin: 'https://example.com/' });
    expect(result).toMatchObject({
      title: 'Gửi Anh An · Thiệp cưới Minh & Lan',
      description: 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan vào 18:30, Thứ Sáu 03/04/2026 tại Nhà hàng Sen, 12 Nguyễn Huệ.',
      siteName: 'Thiệp Cưới',
      guestName: 'Anh An',
      url: 'https://example.com/w/minh-lan/abc123'
    });
  });

  it.each([
    [{ eventTime: '', venue: { name: 'Nhà hàng Sen', address: '' } }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan, Thứ Sáu 03/04/2026 tại Nhà hàng Sen.'],
    [{ eventDate: null, dateText: '', eventTime: '18:30' }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan vào 18:30 tại Nhà hàng Sen, 12 Nguyễn Huệ.'],
    [{ venue: { name: '', address: '' } }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan vào 18:30, Thứ Sáu 03/04/2026.'],
    [{ venue: { name: '', address: '12 Nguyễn Huệ' } }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan vào 18:30, Thứ Sáu 03/04/2026 tại 12 Nguyễn Huệ.'],
    [{ eventDate: null, dateText: '03 · 04 · 2026', eventTime: '', venue: { name: '', address: '' } }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan ngày 03 · 04 · 2026.'],
    [{ eventDate: null, dateText: '', eventTime: '', venue: { name: '', address: '' } }, 'Trân trọng kính mời Anh An đến dự lễ thành hôn của Minh & Lan.']
  ])('builds a clean description with optional fields %#', (changes, expected) => {
    const result = buildMeta({ ...base, ...changes }, 'Anh An');
    expect(result.description).toBe(expected);
    expect(result.description).not.toMatch(/ {2,}|, ,|vào ,|tại ,/);
  });

  it.each([
    ['2026-04-03T00:00:00Z', '03/04/2026', 'Thứ Sáu'],
    ['2026-10-20T00:00:00Z', '20/10/2026', 'Thứ Ba'],
    ['2026-04-02T17:30:00Z', '03/04/2026', 'Thứ Sáu']
  ])('formats %s in Vietnam', (date, day, weekday) => {
    const result = buildMeta({ ...base, eventDate: new Date(date) }, 'An');
    expect(result.description).toContain(`${weekday} ${day}`);
  });

  it('uses dateText when there is no eventDate', () => {
    const result = buildMeta({ ...base, eventDate: null, dateText: '03 · 04 · 2026' });
    expect(result.title).toBe('Thiệp cưới Minh & Lan — 03 · 04 · 2026');
    expect(result.description).toContain('ngày 03 · 04 · 2026');
  });

  it('keeps the no-guest title and name-free empty wedding clean', () => {
    expect(buildMeta(base).title).toBe('Thiệp cưới Minh & Lan — 03/04/2026');
    const empty = buildMeta({ slug: 'empty' });
    expect(empty.title).toBe('Thiệp cưới');
    expect(empty.description).toBe('Trân trọng kính mời bạn đến dự lễ thành hôn.');
  });

  it('substitutes all placeholders while preserving unknown ones', () => {
    const wedding = {
      ...base,
      meta: {
        title: '{khach}: {chure} & {codau} {ngay} {thu} {gio}',
        description: '{diadiem} {diachi} {x}'
      }
    };
    const result = buildMeta(wedding, 'An');
    expect(result.title).toBe('An: Minh & Lan 03/04/2026 Thứ Sáu 18:30');
    expect(result.description).toBe('Gửi An: Nhà hàng Sen 12 Nguyễn Huệ {x}');
    expect(buildMeta({ ...wedding, eventTime: '' }, 'An').title).toBe('An: Minh & Lan 03/04/2026 Thứ Sáu');
  });

  it('keeps guest names in plain owner overrides', () => {
    const result = buildMeta({ ...base, meta: { title: 'Our day', description: 'Join us' } }, 'Anh An');
    expect(result.title).toBe('Gửi Anh An · Our day');
    expect(result.description).toBe('Gửi Anh An: Join us');
  });

  it('limits title and description on word boundaries', () => {
    const result = buildMeta({ ...base, meta: {
      title: 'Long '.repeat(30),
      description: 'Invitation '.repeat(30)
    } });
    expect(result.title.length).toBeLessThanOrEqual(90);
    expect(result.description.length).toBeLessThanOrEqual(200);
    expect(result.title).toMatch(/Long…$/);
    expect(result.description).toMatch(/Invitation…$/);
  });

  it('uses BRAND_NAME', () => {
    process.env.BRAND_NAME = 'Wedding Studio';
    expect(buildMeta(base).siteName).toBe('Wedding Studio');
  });
});
