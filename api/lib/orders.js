const Order = require('../models/Order');
const Wedding = require('../models/Wedding');
const { PLAN_RANK } = require('./plans');
const db = require('../db');

// Webhook, sync and admin mark-paid may race on the same order: claim the pending -> paid
// transition atomically so the plan is applied exactly once, and return the fresh order.
async function applyPaidOrder(order) {
  return db.transaction(async () => {
    const claimed = await Order.findOneAndUpdate(
      { _id: order._id, status: { $ne: 'paid' } },
      { $set: { status: 'paid', paidAt: new Date() } },
      { new: true }
    );
    if (!claimed) return Order.findById(order._id);

    // Only plan fields are written, so a concurrent editor save is never overwritten,
    // and a wedding that already has a higher plan is left untouched.
    const allowedCurrentPlans = Object.keys(PLAN_RANK).filter(plan => PLAN_RANK[plan] <= PLAN_RANK[claimed.plan]);
    await Wedding.updateOne(
      {
        _id: claimed.wedding,
        $or: [{ plan: { $in: allowedCurrentPlans } }, { plan: { $exists: false } }]
      },
      { $set: { plan: claimed.plan, planActivatedAt: new Date() } }
    );
    return claimed;
  });
}

function orderView(order) {
  const data = order.toObject ? order.toObject() : { ...order };
  data.id = String(data._id);
  if (data.user?._id) data.user = String(data.user._id);
  if (data.wedding?._id) data.wedding = String(data.wedding._id);
  delete data._id;
  delete data.__v;
  return data;
}

async function uniqueOrderCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const value = Number(`${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`);
    if (!await Order.exists({ orderCode: value })) return value;
  }
  throw new Error('Không thể tạo mã đơn hàng');
}

module.exports = { applyPaidOrder, orderView, uniqueOrderCode };
