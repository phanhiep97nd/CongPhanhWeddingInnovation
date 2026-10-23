const express = require('express');
const { isValidId } = require('../db/model');
const crypto = require('node:crypto');
const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');
const { fail, pick } = require('../lib/common');
const { serialize } = require('../lib/serialize');
const { weddingFields, normalizeSections } = require('../lib/validators');
const guestRoutes = require('./guestRoutes');
const orderRoutes = require('./orderRoutes');
const { getSettings } = require('../models/Settings');
const { entitlementsFor, limitsFor, expiresAt, paywall } = require('../lib/plans');
const { buildMeta } = require('../lib/meta');

const router = express.Router();
router.use(auth);

async function owned(request, response, next) {
  try {
    if (!isValidId(request.params.id)) {
      return response.status(404).json({ message: 'Không tìm thấy thiệp cưới' });
    }

    const wedding = await Wedding.findOne({ _id: request.params.id, owner: request.user.sub });
    if (!wedding) return response.status(404).json({ message: 'Không tìm thấy thiệp cưới' });
    request.wedding = wedding;
    next();
  } catch (error) {
    next(error);
  }
}

function prepare(body, current) {
  const data = pick(body, weddingFields);
  const customSections = data.customSections ?? current?.customSections ?? [];
  const sections = data.sections ?? current?.sections ?? Wedding.SECTION_KEYS.map(key => ({ key, enabled: true }));
  data.sections = normalizeSections(sections, customSections);
  return data;
}

async function ownerView(wedding) {
  const settings = await getSettings();
  const guests = await Guest.countDocuments({ wedding: wedding._id });
  return {
    ...serialize(wedding, ['owner']),
    sections: normalizeSections(wedding.sections || [], wedding.customSections || []),
    entitlements: entitlementsFor(wedding.plan),
    limits: limitsFor(wedding.plan, settings),
    usage: { guests },
    expiresAt: expiresAt(wedding, settings),
    prices: settings.prices
  };
}

function randomSuffix() {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.randomBytes(4), byte => characters[byte % characters.length]).join('');
}

// ─── WEDDING COLLECTION ───
router.get('/', async (request, response, next) => {
  try {
    const weddings = await Wedding.find({ owner: request.user.sub }).sort({ updatedAt: -1 }).lean();
    const counts = await Guest.groupBy('wedding', { wedding: { $in: weddings.map(wedding => wedding._id) } });
    const countByWedding = new Map(counts.map(item => [String(item._id), item.count]));
    const settings = await getSettings();

    response.json(weddings.map(wedding => ({
      id: String(wedding._id),
      slug: wedding.slug,
      couple: wedding.couple,
      dateText: wedding.dateText,
      eventTime: wedding.eventTime,
      coverImage: wedding.coverImage,
      published: wedding.published,
      plan: wedding.plan || 'free',
      expiresAt: expiresAt(wedding, settings),
      guestCount: countByWedding.get(String(wedding._id)) || 0,
      updatedAt: wedding.updatedAt
    })));
  } catch (error) {
    next(error);
  }
});

router.get('/slug-available', async (request, response, next) => {
  try {
    let slug;
    try {
      slug = weddingFields.slug(request.query.slug);
    } catch {
      return response.json({ available: false, valid: false });
    }
    response.json({ available: !await Wedding.exists({ $or: [{ slug }, { slugAliases: slug }] }), valid: true });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    if (!Object.hasOwn(request.body || {}, 'slug')) fail('Đường dẫn là bắt buộc');
    const data = prepare(request.body);
    const plan = request.user.defaultWeddingPlan === 'premium' ? 'premium' : 'free';
    if ((data.template && data.template !== 'classic' || data.theme?.design) && !entitlementsFor(plan).premiumTemplates) {
      const error = paywall('premiumTemplates');
      return response.status(error.status).json(error.body);
    }
    if (data.gallery && data.gallery.length > limitsFor(plan, await getSettings()).gallery) {
      const error = paywall('largeGallery');
      return response.status(error.status).json(error.body);
    }
    const requestedSlug = data.slug;
    for (let attempt = 0; attempt < 5; attempt++) {
      data.slug = plan === 'premium' ? requestedSlug : `${requestedSlug}-${randomSuffix()}`;
      if (await Wedding.exists({ $or: [{ slug: data.slug }, { slugAliases: data.slug }] })) {
        if (plan === 'premium') return response.status(409).json({ message: 'Đường dẫn đã tồn tại' });
        continue;
      }
      try {
        const wedding = await Wedding.create({ owner: request.user.sub, ...data, plan, planActivatedAt: plan === 'premium' ? new Date() : null });
        return response.status(201).json(await ownerView(wedding));
      } catch (error) {
        if (error.code !== '23505' || attempt === 4) throw error;
      }
    }
    return response.status(409).json({ message: 'Không thể tạo đường dẫn' });
  } catch (error) {
    next(error);
  }
});

router.use('/:id', owned);

// ─── OWNED WEDDING ───
router.get('/:id', async (request, response, next) => {
  try {
    response.json(await ownerView(request.wedding));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/preview-meta', async (request, response, next) => {
  try {
    const code = typeof request.query.g === 'string' ? request.query.g : '';
    const selector = /^[a-f0-9]{24}$/i.test(code) ? { _id: code } : { code };
    const guest = code ? await Guest.findOne({ wedding: request.wedding._id, ...selector }).lean() : null;
    response.json(buildMeta(request.wedding, guest?.invitationName || '', { code }));
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    const data = prepare(request.body, request.wedding);
    const entitlements = entitlementsFor(request.wedding.plan);
    if (data.gallery && data.gallery.length > limitsFor(request.wedding.plan, await getSettings()).gallery) {
      const error = paywall('largeGallery');
      return response.status(error.status).json(error.body);
    }
    if ((data.template && data.template !== 'classic' || data.theme?.design) && !entitlements.premiumTemplates) {
      const error = paywall('premiumTemplates');
      return response.status(error.status).json(error.body);
    }
    if (data.slug && data.slug !== request.wedding.slug) {
      if (!entitlements.permanent) {
        const error = paywall('permanent');
        return response.status(error.status).json(error.body);
      }
      if (await Wedding.exists({ _id: { $ne: request.wedding._id }, $or: [{ slug: data.slug }, { slugAliases: data.slug }] })) {
        return response.status(409).json({ message: 'Đường dẫn đã tồn tại' });
      }
      request.wedding.slugAliases = [...(request.wedding.slugAliases || []).filter(alias => alias !== data.slug), request.wedding.slug].slice(-5);
    }
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const current = request.wedding.get(key);
        request.wedding.set(key, { ...(current?.toObject?.() || current || {}), ...value });
      } else {
        request.wedding.set(key, value);
      }
    }
    await request.wedding.save();
    response.json(await ownerView(request.wedding));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    // PostgreSQL cascades guests/photos and retains order history (wedding=NULL).
    await request.wedding.deleteOne();
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.use('/:id/guests', guestRoutes);
router.use('/:id/orders', orderRoutes);

router.get('/:id/stats', async (request, response, next) => {
  try {
    const stats = await Guest.stats(request.wedding._id);
    response.json({
      total: stats?.total || 0,
      yes: stats?.yes || 0,
      no: stats?.no || 0,
      pending: stats?.pending || 0,
      attendees: stats?.attendees || 0
    });
  } catch (error) {
    next(error);
  }
});

// Owner view of the photo wall; unlike the public list it also works for unpublished weddings.
router.get('/:id/photos', async (request, response, next) => {
  try {
    const photos = await Photo.find({ wedding: request.wedding._id })
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();
    response.json(photos.map(photo => serialize(photo, ['wedding', 'updatedAt'])));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/photos/:photoId', async (request, response, next) => {
  try {
    const photo = await Photo.findOneAndDelete({ _id: request.params.photoId, wedding: request.wedding._id });
    if (!photo) return response.status(404).json({ message: 'Không tìm thấy ảnh' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
