const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Order = require('../models/Order');
const { Settings, getSettings, invalidateSettings } = require('../models/Settings');
const auth = require('../middleware/auth');
const { requireAdmin } = auth;
const { expiresAt } = require('../lib/plans');
const { applyPaidOrder, orderView, uniqueOrderCode } = require('../lib/orders');

const router = express.Router();
router.use(auth, requireAdmin);

function pagination(query) {
  return {
    page: Math.max(1, Number.parseInt(query.page, 10) || 1),
    limit: Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20))
  };
}

function searchRegex(value) {
  return new RegExp(String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function userView(user) {
  return { id: String(user._id), email: user.email, name: user.name, role: user.role || 'user', status: user.status || 'active', createdAt: user.createdAt };
}

// ─── STATS ───
router.get('/stats', async (request, response, next) => {
  try {
    const [users, lockedUsers, weddings, guests, paidWeddings, revenueRows, planRows] = await Promise.all([
      User.countDocuments(), User.countDocuments({ status: 'locked' }), Wedding.countDocuments(),
      Guest.countDocuments(), Wedding.countDocuments({ plan: { $ne: 'free' } }),
      Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt' } }, amount: { $sum: '$amount' }, orders: { $sum: 1 } } }]),
      Wedding.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }])
    ]);
    const monthAmounts = new Map(revenueRows.map(row => [row._id, row]));
    const revenueByMonth = [];
    const now = new Date();
    for (let offset = 11; offset >= 0; offset--) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const month = date.toISOString().slice(0, 7);
      revenueByMonth.push({ month, amount: monthAmounts.get(month)?.amount || 0, orders: monthAmounts.get(month)?.orders || 0 });
    }
    const planCounts = { free: 0, basic: 0, premium: 0 };
    for (const row of planRows) planCounts[row._id || 'free'] = row.count;
    response.json({ users, lockedUsers, weddings, guests, paidWeddings, revenue: revenueRows.reduce((sum, row) => sum + row.amount, 0), revenueByMonth, planCounts });
  } catch (error) {
    next(error);
  }
});

// ─── USERS ───
router.get('/users', async (request, response, next) => {
  try {
    const { page, limit } = pagination(request.query);
    const filter = {};
    if (request.query.q) filter.$or = [{ email: searchRegex(request.query.q) }, { name: searchRegex(request.query.q) }];
    if (['active', 'locked'].includes(request.query.status)) filter.status = request.query.status;
    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(filter)
    ]);
    const ids = users.map(user => user._id);
    const [counts, payments] = await Promise.all([
      Wedding.aggregate([{ $match: { owner: { $in: ids } } }, { $group: { _id: '$owner', count: { $sum: 1 } } }]),
      Order.aggregate([{ $match: { user: { $in: ids }, status: 'paid' } }, { $group: { _id: '$user', amount: { $sum: '$amount' } } }])
    ]);
    const countMap = new Map(counts.map(row => [String(row._id), row.count]));
    const paidMap = new Map(payments.map(row => [String(row._id), row.amount]));
    response.json({ items: users.map(user => ({ ...userView(user), weddingCount: countMap.get(String(user._id)) || 0, paidAmount: paidMap.get(String(user._id)) || 0 })), total, page, limit });
  } catch (error) {
    next(error);
  }
});

router.get('/users/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Không tìm thấy' });
    const user = await User.findById(request.params.id).lean();
    if (!user) return response.status(404).json({ message: 'Không tìm thấy' });
    const [weddings, orders, settings] = await Promise.all([
      Wedding.find({ owner: user._id }).lean(), Order.find({ user: user._id }).sort({ createdAt: -1 }).lean(), getSettings()
    ]);
    const counts = await Guest.aggregate([{ $match: { wedding: { $in: weddings.map(wedding => wedding._id) } } }, { $group: { _id: '$wedding', count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map(row => [String(row._id), row.count]));
    response.json({
      user: userView(user),
      weddings: weddings.map(wedding => ({ id: String(wedding._id), slug: wedding.slug, couple: wedding.couple, plan: wedding.plan, guestCount: countMap.get(String(wedding._id)) || 0, createdAt: wedding.createdAt, expiresAt: expiresAt(wedding, settings) })),
      orders: orders.map(orderView)
    });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Không tìm thấy' });
    const { status, role } = request.body;
    if ((status !== undefined && !['active', 'locked'].includes(status)) || (role !== undefined && !['user', 'admin'].includes(role))) {
      return response.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
    if (request.params.id === request.user.sub && (status === 'locked' || role === 'user')) {
      return response.status(400).json({ message: 'Không thể tự khoá hoặc hạ quyền' });
    }
    const changes = {};
    if (status !== undefined) changes.status = status;
    if (role !== undefined) changes.role = role;
    const user = await User.findByIdAndUpdate(request.params.id, { $set: changes }, { new: true, runValidators: true });
    if (!user) return response.status(404).json({ message: 'Không tìm thấy' });
    response.json(userView(user));
  } catch (error) {
    next(error);
  }
});

// ─── WEDDINGS AND ORDERS ───
router.patch('/weddings/:id/plan', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) return response.status(404).json({ message: 'Không tìm thấy' });
    const { plan, note } = request.body;
    if (!['free', 'basic', 'premium'].includes(plan) || (note !== undefined && (typeof note !== 'string' || note.length > 500))) {
      return response.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
    const wedding = await Wedding.findById(request.params.id);
    if (!wedding) return response.status(404).json({ message: 'Không tìm thấy' });
    wedding.plan = plan;
    wedding.planActivatedAt = plan === 'free' ? null : new Date();
    await wedding.save();
    await Order.create({ orderCode: await uniqueOrderCode(), wedding: wedding._id, user: wedding.owner, plan, amount: 0, status: 'paid', method: 'manual', note: note || '', paidAt: new Date() });
    response.json({ id: String(wedding._id), slug: wedding.slug, plan: wedding.plan, planActivatedAt: wedding.planActivatedAt });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (request, response, next) => {
  try {
    const { page, limit } = pagination(request.query);
    const filter = {};
    if (['pending', 'paid', 'cancelled', 'expired'].includes(request.query.status)) filter.status = request.query.status;
    if (request.query.q) {
      const regex = searchRegex(request.query.q);
      const [users, weddings] = await Promise.all([User.find({ email: regex }).select('_id'), Wedding.find({ slug: regex }).select('_id')]);
      filter.$or = [{ user: { $in: users.map(user => user._id) } }, { wedding: { $in: weddings.map(wedding => wedding._id) } }];
      if (/^\d+$/.test(request.query.q)) filter.$or.push({ orderCode: Number(request.query.q) });
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('user', 'email').populate('wedding', 'slug'),
      Order.countDocuments(filter)
    ]);
    response.json({ items: orders.map(order => ({ ...orderView(order), userEmail: order.user?.email || '', weddingSlug: order.wedding?.slug || '' })), total, page, limit });
  } catch (error) {
    next(error);
  }
});

router.post('/orders/:orderCode/mark-paid', async (request, response, next) => {
  try {
    const order = await Order.findOne({ orderCode: Number(request.params.orderCode) });
    if (!order) return response.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    const paid = await applyPaidOrder(order);
    response.json(orderView(paid));
  } catch (error) {
    next(error);
  }
});

// ─── SETTINGS ───
router.get('/settings', async (request, response, next) => {
  try {
    response.json(await getSettings());
  } catch (error) {
    next(error);
  }
});

router.put('/settings', async (request, response, next) => {
  try {
    const body = request.body || {};
    const current = await getSettings();
    const settings = { prices: { ...current.prices, ...body.prices } };
    for (const key of ['freeGuestLimit', 'freeGalleryLimit', 'paidGalleryLimit', 'freeExpiryDays']) {
      settings[key] = body[key] === undefined ? current[key] : body[key];
    }
    const prices = Object.values(settings.prices);
    const limits = [settings.freeGuestLimit, settings.freeGalleryLimit, settings.paidGalleryLimit];
    if (prices.some(value => !Number.isInteger(value) || value < 1000 || value > 10000000) ||
        limits.some(value => !Number.isInteger(value) || value < 1 || value > 1000) ||
        !Number.isInteger(settings.freeExpiryDays) || settings.freeExpiryDays < 1 || settings.freeExpiryDays > 3650) {
      return response.status(400).json({ message: 'Dữ liệu không hợp lệ' });
    }
    const saved = await Settings.findByIdAndUpdate('global', { $set: settings }, { new: true, upsert: true, runValidators: true }).lean();
    invalidateSettings();
    response.json(saved);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
