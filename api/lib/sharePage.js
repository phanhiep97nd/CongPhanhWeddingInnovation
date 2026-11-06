// The page link-preview bots (Zalo, Facebook, Messenger…) read for /w/:slug[/:code] on the nginx deployment.
// It carries only the Open Graph tags built by buildMeta, the same data the editor's "Xem trước khi gửi" shows;
// people are served the app itself. (middleware.js does the same on the earlier Vercel deployment.)
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function sharePage(meta) {
  let image = '';
  try { if (meta.image) image = new URL(meta.image, new URL(meta.url).origin).href; } catch { /* keep the other tags */ }
  const tag = (name, value, property = false) => `<meta ${property ? 'property' : 'name'}="${name}" content="${escape(value)}">`;
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    tag('description', meta.description),
    tag('og:title', meta.title, true),
    tag('og:description', meta.description, true),
    ...(image ? [tag('og:image', image, true), tag('og:image:width', '1200', true), tag('og:image:height', '630', true)] : []),
    tag('og:url', meta.url, true),
    tag('og:type', 'website', true),
    tag('og:site_name', meta.siteName, true),
    tag('og:locale', 'vi_VN', true),
    tag('twitter:card', 'summary_large_image'),
    tag('twitter:title', meta.title),
    tag('twitter:description', meta.description),
    ...(image ? [tag('twitter:image', image)] : []),
  ].join('');
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">${tags}<link rel="canonical" href="${escape(meta.url)}"></head><body><a href="${escape(meta.url)}">${escape(meta.title)}</a></body></html>`;
}

module.exports = { sharePage };
