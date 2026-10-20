const express = require('express');
const mongoose = require('mongoose');
const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');
const { fail, pick } = require('../lib/common');
const { serialize } = require('../lib/serialize');
const { weddingFields, normalizeSections } = require('../lib/validators');
const guestRoutes = require('./guestRoutes');

const router = express.Router();
router.use(auth);

async function owned(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
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

// ─── WEDDING COLLECTION ───
router.get('/', async (request, response, next) => {
  try {
    const weddings = await Wedding.find({ owner: request.user.sub }).sort({ updatedAt: -1 }).lean();
    const counts = await Guest.aggregate([
      { $match: { wedding: { $in: weddings.map(wedding => wedding._id) } } },
      { $group: { _id: '$wedding', count: { $sum: 1 } } }
    ]);
    const countByWedding = new Map(counts.map(item => [String(item._id), item.count]));

    response.json(weddings.map(wedding => ({
      id: String(wedding._id),
      slug: wedding.slug,
      couple: wedding.couple,
      dateText: wedding.dateText,
      coverImage: wedding.coverImage,
      published: wedding.published,
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
    response.json({ available: !await Wedding.exists({ slug }), valid: true });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    if (!Object.hasOwn(request.body || {}, 'slug')) fail('Đường dẫn là bắt buộc');
    const wedding = await Wedding.create({ owner: request.user.sub, ...prepare(request.body) });
    response.status(201).json(serialize(wedding, ['owner']));
  } catch (error) {
    next(error);
  }
});

router.use('/:id', owned);

// ─── OWNED WEDDING ───
router.get('/:id', (request, response) => response.json(serialize(request.wedding, ['owner'])));

router.put('/:id', async (request, response, next) => {
  try {
    const data = prepare(request.body, request.wedding);
    for (const [key, value] of Object.entries(data)) {
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const current = request.wedding.get(key);
        request.wedding.set(key, { ...(current.toObject?.() || current), ...value });
      } else {
        request.wedding.set(key, value);
      }
    }
    await request.wedding.save();
    response.json(serialize(request.wedding, ['owner']));
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    await Promise.all([
      Guest.deleteMany({ wedding: request.wedding._id }),
      Photo.deleteMany({ wedding: request.wedding._id })
    ]);
    await request.wedding.deleteOne();
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.use('/:id/guests', guestRoutes);

router.get('/:id/stats', async (request, response, next) => {
  try {
    const [stats] = await Guest.aggregate([
      { $match: { wedding: request.wedding._id } },
      { $group: {
        _id: null,
        total: { $sum: 1 },
        yes: { $sum: { $cond: [{ $eq: ['$status', 'yes'] }, 1, 0] } },
        no: { $sum: { $cond: [{ $eq: ['$status', 'no'] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        attendees: { $sum: { $cond: [{ $eq: ['$status', 'yes'] }, '$guestCount', 0] } }
      } }
    ]);
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
