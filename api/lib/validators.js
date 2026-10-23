const { fail, string, bool, count, url, color, shape, items } = require('./common');
const { SECTION_KEYS } = require('../models/Wedding');

function slug(value) {
  const result = string(value, 50).toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$/.test(result)) fail('Đường dẫn không hợp lệ');
  return result;
}

function eventDate(value) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(value) || Number.isNaN(Date.parse(value))) {
    fail('Ngày không hợp lệ');
  }
  return new Date(value);
}

function eventTime(value) {
  if (value === '') return '';
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    fail('Giờ không hợp lệ');
  }
  return value;
}

function timeline(value) {
  return items(value, 50, {
    id: item => string(item, 100),
    time: item => string(item, 100),
    title: item => string(item, 200),
    desc: item => string(item, 1000)
  });
}

function gallery(value) {
  return items(value, 1000, {
    id: item => string(item, 100),
    url,
    title: item => string(item, 200),
    desc: item => string(item, 1000),
    full: bool
  });
}

function giftBox(value) {
  const data = shape(value, {
    note: item => string(item, 300),
    accounts: accounts => items(accounts, 4, {
      id: item => string(item, 100),
      label: item => string(item, 40),
      bankBin: item => {
        if (typeof item !== 'string' || !/^\d{6}$/.test(item)) fail('Mã ngân hàng không hợp lệ');
        return item;
      },
      bankName: item => string(item, 100),
      accountNumber: item => {
        if (typeof item !== 'string' || !/^[0-9A-Za-z]{4,30}$/.test(item)) fail('Số tài khoản không hợp lệ');
        return item;
      },
      accountName: item => string(item, 60)
    })
  });
  return data;
}

function sections(value) {
  if (!Array.isArray(value) || value.length > 28) fail();
  return value.map(item => shape(item, {
    key: key => string(key, 120, true),
    enabled: bool
  }));
}

const weddingFields = {
  slug,
  published: bool,
  couple: value => shape(value, {
    groom: item => string(item, 100),
    bride: item => string(item, 100),
    groomFull: item => string(item, 100),
    brideFull: item => string(item, 100)
  }),
  eventDate,
  eventTime,
  dateText: value => string(value, 100),
  venue: value => shape(value, {
    name: item => string(item, 100),
    address: item => string(item, 500),
    mapUrl: url
  }),
  coverImage: url,
  ogImage: url,
  story: value => shape(value, {
    title: item => string(item, 200),
    body: item => string(item, 5000),
    image: url
  }),
  timeline,
  gallery,
  giftBox,
  viewModes: value => {
    const allowed = ['3d', 'mixed', 'normal'];
    if (!Array.isArray(value) || !value.length || value.some(mode => !allowed.includes(mode))) {
      fail('Cần bật ít nhất một chế độ xem hợp lệ');
    }
    // Keep a stable order and drop duplicates.
    return allowed.filter(mode => value.includes(mode));
  },
  template: value => {
    if (!['classic', 'minimal', 'hy3d'].includes(value)) fail('Mẫu thiệp không hợp lệ');
    return value;
  },
  musicUrl: url,
  zaloGroupLink: url,
  dressCode: value => shape(value, {
    note: item => string(item, 1000),
    colors: colorValues => {
      if (!Array.isArray(colorValues) || colorValues.length > 12) fail();
      return colorValues.map(color);
    }
  }),
  customSections: value => items(value, 20, {
    id: item => string(item, 100),
    title: item => string(item, 200),
    body: item => string(item, 5000),
    image: url
  }),
  sections,
  meta: value => shape(value, {
    title: item => string(item, 200),
    description: item => string(item, 1000)
  }),
  theme: value => shape(value, { primary: color, design: item => {
    if (typeof item !== 'string' || !require('./invitationDesigns').has(item)) fail('Mẫu thiệp không hợp lệ');
    return item;
  } })
};

const guestFields = {
  invitationName: value => string(value, 100, true),
  name: value => string(value, 100),
  phone: value => string(value, 50),
  status: value => {
    if (!['pending', 'yes', 'no'].includes(value)) fail('Trạng thái không hợp lệ');
    return value;
  },
  guestCount: count,
  joinGroup: bool,
  pickupPoint: value => string(value, 200),
  room: value => string(value, 100),
  note: value => string(value, 1000)
};

function normalizeSections(sectionsToNormalize, customSections) {
  const allowed = new Set([...SECTION_KEYS, ...customSections.map(item => `custom:${item.id}`)]);
  const seen = new Set();
  const result = [];

  for (const section of sectionsToNormalize) {
    if (allowed.has(section.key) && !seen.has(section.key)) {
      seen.add(section.key);
      result.push({ key: section.key, enabled: section.enabled });
    }
  }

  for (const key of SECTION_KEYS) {
    if (!seen.has(key)) result.push({ key, enabled: false });
  }

  for (const section of customSections) {
    const key = `custom:${section.id}`;
    if (!seen.has(key)) result.push({ key, enabled: true });
  }

  return result;
}

module.exports = { weddingFields, guestFields, normalizeSections, eventDate, eventTime, slug };
