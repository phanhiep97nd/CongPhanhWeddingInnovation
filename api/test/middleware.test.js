import { describe, it, expect, vi, afterEach } from 'vitest';
import middleware, { isCrawler, parseInvitePath, escapeHtml, renderMetaHtml, injectMeta } from '../../middleware.js';

const shell = '<!doctype html><html><head><title>Old</title><meta name="description" content="Old"><meta property="og:title" content="Old"><meta name="twitter:title" content="Old"></head><body><div id="root"></div></body></html>';
const zaloAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Zalo iOS/474 ZaloTheme/light ZaloLanguage/vi';
const requestFor = (path, agent = 'facebookexternalhit') =>
  new Request(`https://site.test${path}`, { headers: { 'user-agent': agent } });

afterEach(() => vi.unstubAllGlobals());

function mockFetch(meta = { title: 'For <An>', description: 'Hello', image: '/cover.jpg' }) {
  const fetch = vi.fn(async input => String(input).includes('/index.html')
    ? { ok: true, text: async () => shell }
    : { ok: true, json: async () => meta });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('preview helpers', () => {
  it('recognizes Zalo and other crawlers', () => {
    expect(isCrawler(zaloAgent)).toBe(true);
    expect(isCrawler('facebookexternalhit')).toBe(true);
    expect(isCrawler('Mozilla')).toBe(false);
  });

  it('parses a personalized invite path', () => {
    expect(parseInvitePath('/w/my-wedding/abc123')).toEqual({ slug: 'my-wedding', code: 'abc123' });
  });

  it('rejects other paths and invalid slugs', () => {
    expect(parseInvitePath('/other/x')).toBeNull();
    expect(parseInvitePath('/w/x')).toBeNull();
  });

  it('escapes HTML control characters', () => {
    expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
  });

  it('escapes og:url in minimal HTML', () => {
    expect(renderMetaHtml({}, 'https://site.test/w/abc?x=<bad>'))
      .toContain('og:url" content="https://site.test/w/abc?x=&lt;bad&gt;"');
  });

  it('replaces old title, description, and social tags in the shell', () => {
    const html = injectMeta(shell, { title: 'New' }, 'https://site.test/w/abc');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain('content="Old"');
    expect(html).toContain('<div id="root"></div>');
  });

  it('removes unquoted social attributes too', () => {
    const html = injectMeta('<html><head><meta property=og:title content=Old></head><body></body></html>',
      { title: 'New' }, 'https://site.test/w/abc');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    expect(html).not.toContain('content=Old');
  });
});

describe('crawler middleware', () => {
  it('serves Zalo in-app users the complete personalized shell', async () => {
    mockFetch();
    const response = await middleware(requestFor('/w/my-wedding/abc123', zaloAgent));
    const html = await response.text();
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('property="og:title" content="For &lt;An&gt;"');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=300');
  });

  it('fetches metadata and index.html for personalized invites', async () => {
    const fetch = mockFetch();
    await middleware(requestFor('/w/my-wedding/abc123'));
    expect(fetch.mock.calls.map(call => String(call[0]))).toEqual(expect.arrayContaining([
      expect.stringContaining('?g=abc123'),
      'https://site.test/index.html'
    ]));
  });

  it('falls back to minimal HTML when shell fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async input => String(input).includes('/index.html')
      ? Promise.reject(new Error('failed'))
      : { ok: true, json: async () => ({ title: 'Guest title' }) }));
    const html = await (await middleware(requestFor('/w/my-wedding'))).text();
    expect(html).toContain('Guest title');
    expect(html).not.toContain('<div id="root"></div>');
  });

  it('injects generic metadata when meta fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async input => String(input).includes('/index.html')
      ? { ok: true, text: async () => shell }
      : Promise.reject(new Error('failed'))));
    const html = await (await middleware(requestFor('/w/my-wedding'))).text();
    expect(html).toContain('Thiệp cưới');
    expect(html).toContain('<div id="root"></div>');
  });

  it('returns undefined for humans', async () => {
    expect(await middleware(requestFor('/w/my-wedding', 'Mozilla'))).toBeUndefined();
  });

  it('returns undefined outside invite paths', async () => {
    expect(await middleware(requestFor('/about'))).toBeUndefined();
  });
});
