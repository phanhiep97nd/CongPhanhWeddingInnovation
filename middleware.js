export const config = { matcher: ['/w/:path*'] };

const bots = /facebookexternalhit|Facebot|Zalo|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Pinterest|WhatsApp|Googlebot|bingbot|Applebot|Skype|viber/i;
const fallbackMeta = {
  title: 'Thiệp cưới',
  description: 'Trân trọng kính mời bạn đến chung vui.',
  siteName: 'Thiệp cưới',
  image: ''
};

export function isCrawler(userAgent) {
  return bots.test(userAgent || '');
}

export function parseInvitePath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'w' || parts.length < 2 || parts.length > 3) return null;

  try {
    const slug = decodeURIComponent(parts[1]);
    const code = parts[2] ? decodeURIComponent(parts[2]) : undefined;
    if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(slug)) return null;
    if (code && !/^[a-z0-9]+$/i.test(code)) return null;
    return { slug, code };
  } catch {
    return null;
  }
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function metaTags(meta, url) {
  const title = meta.title || fallbackMeta.title;
  const description = meta.description || fallbackMeta.description;
  const siteName = meta.siteName || fallbackMeta.siteName;
  let image = '';

  try {
    if (meta.image) image = new URL(meta.image, new URL(url).origin).href;
  } catch {
    // Ignore an invalid image URL while retaining the other preview tags.
  }

  const tag = (name, value, property = false) =>
    `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}">`;

  return [
    `<title>${escapeHtml(title)}</title>`,
    tag('description', description),
    tag('og:title', title, true),
    tag('og:description', description, true),
    ...(image ? [
      tag('og:image', image, true),
      tag('og:image:width', '1200', true),
      tag('og:image:height', '630', true)
    ] : []),
    tag('og:url', url, true),
    tag('og:type', 'website', true),
    tag('og:site_name', siteName, true),
    tag('og:locale', 'vi_VN', true),
    tag('twitter:card', 'summary_large_image'),
    tag('twitter:title', title),
    tag('twitter:description', description),
    ...(image ? [tag('twitter:image', image)] : [])
  ].join('');
}

function attributeValue(tag, attribute) {
  const pattern = new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s/>]+))`, 'i');
  const match = pattern.exec(tag);
  return (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').toLowerCase();
}

export function renderMetaHtml(meta, url) {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">${metaTags(meta, url)}</head><body></body></html>`;
}

export function injectMeta(shellHtml, meta, url) {
  const headMatch = /<head(?:\s[^>]*)?>/i.exec(shellHtml);
  if (!headMatch) return renderMetaHtml(meta, url);

  const headEnd = shellHtml.search(/<\/head\s*>/i);
  if (headEnd < 0) return renderMetaHtml(meta, url);

  const beforeHead = shellHtml.slice(0, headMatch.index + headMatch[0].length);
  const oldHead = shellHtml.slice(headMatch.index + headMatch[0].length, headEnd);
  const afterHead = shellHtml.slice(headEnd);
  const cleanedHead = oldHead
    .replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, tag => {
      if (attributeValue(tag, 'name') === 'description') return '';
      if (attributeValue(tag, 'property').startsWith('og:')) return '';
      if (attributeValue(tag, 'name').startsWith('twitter:')) return '';
      return tag;
    });

  return `${beforeHead}${metaTags(meta, url)}${cleanedHead}${afterHead}`;
}

async function fetchMeta(endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const response = await fetch(endpoint, { signal: controller.signal });
    if (!response.ok) throw new Error('Meta unavailable');
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function middleware(request) {
  if (!isCrawler(request.headers.get('user-agent'))) return undefined;

  const url = new URL(request.url);
  const path = parseInvitePath(url.pathname);
  if (!path) return undefined;

  const origin = (process.env.API_ORIGIN || 'https://congphanhweddinginnovation-api.up.railway.app').replace(/\/$/, '');
  const endpoint = `${origin}/public/weddings/${encodeURIComponent(path.slug)}/meta${path.code ? `?g=${encodeURIComponent(path.code)}` : ''}`;
  const shellUrl = new URL('/index.html', request.url);
  const [metaResult, shellResult] = await Promise.allSettled([
    fetchMeta(endpoint),
    fetch(shellUrl).then(async response => {
      if (!response.ok) throw new Error('SPA shell unavailable');
      return response.text();
    })
  ]);

  const meta = metaResult.status === 'fulfilled' ? metaResult.value : fallbackMeta;
  const html = shellResult.status === 'fulfilled'
    ? injectMeta(shellResult.value, meta, url.href)
    : renderMetaHtml(meta, url.href);

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
