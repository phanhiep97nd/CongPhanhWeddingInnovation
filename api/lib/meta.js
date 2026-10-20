const { personalizedOgImage } = require('./images');

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'
});
const weekdayFormat = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh'
});
const weekdays = {
  'chủ nhật': 'Chủ Nhật',
  'thứ hai': 'Thứ Hai',
  'thứ ba': 'Thứ Ba',
  'thứ tư': 'Thứ Tư',
  'thứ năm': 'Thứ Năm',
  'thứ sáu': 'Thứ Sáu',
  'thứ bảy': 'Thứ Bảy'
};

function weddingDate(wedding) {
  const date = wedding.eventDate ? new Date(wedding.eventDate) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { ngay: wedding.dateText || '', thu: '' };
  }
  return {
    ngay: dateFormat.format(date),
    thu: weekdays[weekdayFormat.format(date).toLocaleLowerCase('vi-VN')] || ''
  };
}

function fillTemplate(template, values) {
  return template.replace(/\{([^{}]+)\}/g, (match, key) =>
    Object.hasOwn(values, key) ? values[key] : match)
    .replace(/ {2,}/g, ' ')
    .trim();
}

function limitText(value, max) {
  if (value.length <= max) return value;
  const slice = value.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd()}…`;
}

function defaultDescription(values) {
  const couple = [values.chure, values.codau].filter(Boolean).join(' & ');
  let result = `Trân trọng kính mời ${values.khach} đến dự lễ thành hôn`;
  if (couple) result += ` của ${couple}`;
  if (values.gio) result += ` vào ${values.gio}`;
  if (values.thu) result += `, ${values.thu}`;
  if (values.ngay) result += values.thu ? ` ${values.ngay}` : ` ngày ${values.ngay}`;
  if (values.diadiem) result += ` tại ${values.diadiem}`;
  if (values.diachi) result += values.diadiem ? `, ${values.diachi}` : ` tại ${values.diachi}`;
  return `${result}.`;
}

function buildMeta(wedding, guestName = '', options = {}) {
  const { ngay, thu } = weddingDate(wedding);
  const values = {
    khach: guestName || 'bạn',
    chure: wedding.couple?.groom || '',
    codau: wedding.couple?.bride || '',
    ngay,
    thu,
    gio: wedding.eventTime || '',
    diadiem: wedding.venue?.name || '',
    diachi: wedding.venue?.address || ''
  };
  const couple = [values.chure, values.codau].filter(Boolean).join(' & ');
  const defaultTitle = guestName
    ? `Gửi ${guestName} · Thiệp cưới${couple ? ` ${couple}` : ''}`
    : `Thiệp cưới${couple ? ` ${couple}` : ''}${ngay ? ` — ${ngay}` : ''}`;
  let title = wedding.meta?.title ? fillTemplate(wedding.meta.title, values) : defaultTitle;
  let description = wedding.meta?.description
    ? fillTemplate(wedding.meta.description, values)
    : defaultDescription(values);

  if (guestName && wedding.meta?.title && !title.includes(guestName)) {
    title = `Gửi ${guestName} · ${title}`;
  }
  if (guestName && wedding.meta?.description && !description.includes(guestName)) {
    description = `Gửi ${guestName}: ${description}`;
  }

  const siteOrigin = (options.siteOrigin || process.env.SITE_ORIGIN || process.env.VITE_SITE_BASE || 'https://congphanh.vercel.app').replace(/\/$/, '');
  const guestPath = options.code ? `/${encodeURIComponent(options.code)}` : '';
  return {
    title: limitText(title, 90),
    description: limitText(description, 200),
    // Weddings without a photo fall back to the Hỷ Thiệp brand card (the middleware makes it absolute).
    image: personalizedOgImage(wedding.ogImage || wedding.coverImage || '', guestName) || '/brand/og-default.png',
    siteName: process.env.BRAND_NAME || 'Hỷ Thiệp',
    guestName,
    url: `${siteOrigin}/w/${encodeURIComponent(wedding.slug)}${guestPath}`
  };
}

module.exports = { buildMeta };
