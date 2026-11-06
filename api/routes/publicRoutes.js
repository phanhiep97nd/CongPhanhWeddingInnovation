const express = require('express');
const rateLimit = require('express-rate-limit');
const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Photo = require('../models/Photo');
const Wish = require('../models/Wish');
const { fail, string, pick, url } = require('../lib/common');
const { serialize, publicGuest } = require('../lib/serialize');
const { guestFields, normalizeSections } = require('../lib/validators');
const { createGuest } = require('../lib/guestCodes');
const { buildMeta } = require('../lib/meta');
const { sharePage } = require('../lib/sharePage');
const { getSettings } = require('../models/Settings');
const { FEATURES, entitlementsFor, isExpired } = require('../lib/plans');

const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});

async function loadWedding(request, response, next) {
  try {
    const wedding = await Wedding.findOne({ $or: [{ slug: request.params.slug }, { slugAliases: request.params.slug }], published: true }).lean();
    if (!wedding) return response.status(404).json({ message: 'Không tìm thấy thiệp cưới' });
    const settings = await getSettings();
    if (isExpired(wedding, settings)) {
      return response.status(410).json({ message: 'Thiệp đã hết hạn', code: 'EXPIRED' });
    }
    request.wedding = wedding;
    next();
  } catch (error) {
    next(error);
  }
}

function findGuest(wedding, code) {
  const selector = /^[a-f0-9]{24}$/i.test(code) ? { _id: code } : { code };
  return Guest.findOne({ wedding: wedding._id, ...selector });
}

router.get('/pricing', async (request, response, next) => {
  try {
    const settings = await getSettings();
    const labels = {
      unlimitedGuests: 'Không giới hạn khách mời', removeBranding: 'Ẩn thương hiệu',
      largeGallery: 'Thư viện ảnh lớn', excelExport: 'Xuất Excel', guestQr: 'Mã QR khách mời',
      photoWall: 'Tường ảnh', customMusic: 'Nhạc riêng', voiceInvite: 'Lời mời ghi âm cho từng khách',
      permanent: 'Thiệp vĩnh viễn', premiumTemplates: 'Mẫu thiệp cao cấp'
    };
    response.json({
      prices: settings.prices,
      freeGuestLimit: settings.freeGuestLimit,
      freeGalleryLimit: settings.freeGalleryLimit,
      paidGalleryLimit: settings.paidGalleryLimit,
      features: Object.entries(FEATURES).map(([key, plan]) => ({ key, label: labels[key], plan }))
    });
  } catch (error) {
    next(error);
  }
});

router.use('/weddings/:slug', loadWedding);

router.get('/weddings/:slug/wishes', async (request, response, next) => {
  try {
    const wishes = await Wish.find({ wedding: request.wedding._id }).sort({ createdAt: -1 }).limit(50).lean();
    response.set('Cache-Control', 'no-store').json(wishes.map(wish => serialize(wish, ['wedding', 'updatedAt'])));
  } catch (error) { next(error); }
});
router.post('/weddings/:slug/wishes', limiter, async (request, response, next) => {
  try {
    const author = string(request.body?.author, 100, true);
    const message = string(request.body?.message, 500, true);
    const wish = await Wish.create({ wedding: request.wedding._id, author, message });
    response.status(201).json(serialize(wish, ['wedding', 'updatedAt']));
  } catch (error) { next(error); }
});

router.get('/weddings/:slug/template-render', async (request, response, next) => {
  try {
    if (!request.wedding.importedTemplate) return response.sendStatus(404);
    const guest = typeof request.query.g === 'string' ? await findGuest(request.wedding, request.query.g).lean() : null;
    response.set('Cache-Control', 'no-store').json({ html: require('../lib/templateLibrary').render(request.wedding.importedTemplate, { guestName: guest?.invitationName || '', wedding: request.wedding }) });
  } catch (error) { next(error); }
});

// ─── PUBLIC WEDDING AND GUESTS ───
router.get('/weddings/:slug', (request, response) => {
  const wedding = serialize(request.wedding, ['owner', 'slugAliases', 'planActivatedAt', 'importedTemplate']);
  wedding.hasImportedTemplate = Boolean(request.wedding.importedTemplate);
  wedding.plan = wedding.plan || 'free';
  wedding.sections = normalizeSections(wedding.sections || [], wedding.customSections || []);
  const entitlements = entitlementsFor(wedding.plan);
  wedding.entitlements = entitlements;
  wedding.showBranding = !entitlements.removeBranding;
  if (!entitlements.premiumTemplates) { wedding.template = 'classic'; if (wedding.theme) wedding.theme = { ...wedding.theme, design: undefined }; }
  else wedding.giftBox = wedding.giftBox || { note: '', accounts: [] };
  if (!entitlements.customMusic) wedding.musicUrl = '';
  if (!entitlements.photoWall) {
    wedding.sections = wedding.sections.map(section => section.key === 'photoWall' ? { ...section, enabled: false } : section);
  }
  response.set('Cache-Control', 'public, max-age=60').json(wedding);
});

router.get('/weddings/:slug/guests/:code', async (request, response, next) => {
  try {
    const guest = await findGuest(request.wedding, request.params.code).lean();
    if (!guest) return response.status(404).json({ message: 'Không tìm thấy khách mời' });
    response.json(publicGuest(guest, entitlementsFor(request.wedding.plan).voiceInvite));
  } catch (error) {
    next(error);
  }
});

router.put('/weddings/:slug/guests/:code/rsvp', limiter, async (request, response, next) => {
  try {
    const fields = {
      status: guestFields.status,
      guestCount: guestFields.guestCount,
      joinGroup: guestFields.joinGroup,
      pickupPoint: guestFields.pickupPoint,
      phone: guestFields.phone
    };
    const data = pick(request.body, fields);
    const guest = await findGuest(request.wedding, request.params.code);
    if (!guest) return response.status(404).json({ message: 'Không tìm thấy khách mời' });
    Object.assign(guest, data);
    await guest.save();
    response.json(publicGuest(guest, entitlementsFor(request.wedding.plan).voiceInvite));
  } catch (error) {
    next(error);
  }
});

router.post('/weddings/:slug/register', limiter, async (request, response, next) => {
  try {
    const data = pick(request.body, {
      invitationName: guestFields.invitationName,
      phone: guestFields.phone,
      status: guestFields.status,
      guestCount: guestFields.guestCount,
      joinGroup: guestFields.joinGroup,
      pickupPoint: guestFields.pickupPoint
    });
    if (!data.invitationName) fail('Tên trên thiệp là bắt buộc');
    const guest = await createGuest(request.wedding._id, {
      name: data.invitationName,
      note: 'Tự đăng ký qua trang web',
      ...data
    });
    response.status(201).json(publicGuest(guest));
  } catch (error) {
    next(error);
  }
});

router.get('/weddings/:slug/rooms', async (request, response, next) => {
  try {
    const guests = await Guest.find({ wedding: request.wedding._id, status: 'yes' })
      .select('invitationName room').lean();
    guests.sort((first, second) =>
      Number(!!second.room) - Number(!!first.room) ||
      String(first.room || '').localeCompare(String(second.room || '')) ||
      first.invitationName.localeCompare(second.invitationName));
    response.json(guests.map(guest => ({ invitationName: guest.invitationName, room: guest.room })));
  } catch (error) {
    next(error);
  }
});

// ─── PHOTOS ───
router.get('/weddings/:slug/photos', async (request, response, next) => {
  try {
    const photos = await Photo.find({ wedding: request.wedding._id })
      .sort({ createdAt: -1 }).limit(200).lean();
    response.json(photos.map(photo => serialize(photo, ['wedding', 'updatedAt'])));
  } catch (error) {
    next(error);
  }
});

router.post('/weddings/:slug/photos', limiter, async (request, response, next) => {
  try {
    if (!entitlementsFor(request.wedding.plan).photoWall) {
      return response.status(403).json({ message: 'Tường ảnh chỉ dành cho gói Premium' });
    }
    const data = pick(request.body, {
      url,
      caption: value => string(value, 500),
      author: value => string(value, 100)
    });
    if (!data.url) fail('URL ảnh là bắt buộc');
    const photo = await Photo.create({ wedding: request.wedding._id, ...data });
    response.status(201).json(serialize(photo, ['wedding', 'updatedAt']));
  } catch (error) {
    next(error);
  }
});

// ─── SOCIAL PREVIEW ───
router.get('/weddings/:slug/meta', async (request, response, next) => {
  try {
    const wedding = request.wedding;
    let guestName = '';
    if (typeof request.query.g === 'string') {
      const guest = await findGuest(wedding, request.query.g).lean();
      guestName = guest?.invitationName || '';
    }

    const code = typeof request.query.g === 'string' ? request.query.g : '';
    response.json(buildMeta(wedding, guestName, { code }));
  } catch (error) {
    next(error);
  }
});

// Link-preview bots are routed here by nginx for /w/:slug[/:code]; see deploy/nginx.home.conf.
router.get('/weddings/:slug/share', async (request, response, next) => {
  try {
    const code = typeof request.query.g === 'string' ? request.query.g : '';
    const guest = code ? await findGuest(request.wedding, code).lean() : null;
    response.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }).send(sharePage(buildMeta(request.wedding, guest?.invitationName || '', { code: guest ? code : '' })));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
