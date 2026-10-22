const express = require('express');
const Order = require('../models/Order');
const { getSettings } = require('../models/Settings');
const { upgradeAmount } = require('../lib/plans');
const payos = require('../lib/payos');
const { applyPaidOrder, orderView, uniqueOrderCode } = require('../lib/orders');

const router = express.Router({ mergeParams: true });

router.post('/', async (request, response, next) => {
  try {
    const plan = request.body.plan;
    if (!['basic', 'premium'].includes(plan)) return response.status(400).json({ message: 'Gói không hợp lệ' });
    if (!payos.isConfigured()) return response.status(503).json({ code: 'PAYMENT_UNAVAILABLE', message: 'Thanh toán chưa sẵn sàng' });
    const settings = await getSettings();
    const amount = upgradeAmount(request.wedding.plan, plan, settings.prices);
    if (amount <= 0) return response.status(400).json({ message: 'Không thể nâng cấp gói này' });

    // Reuse only an order with the same amount: the price or the current plan may have changed
    // since it was created (e.g. premium left unpaid, then basic bought -> the difference is lower).
    const pending = await Order.findOne({
      wedding: request.wedding._id,
      plan,
      amount,
      status: 'pending',
      checkoutUrl: { $ne: '' }
    }).sort({ createdAt: -1 });
    if (pending && Date.now() - pending.createdAt.getTime() < 15 * 60 * 1000) {
      return response.status(201).json({ orderCode: pending.orderCode, checkoutUrl: pending.checkoutUrl, qrCode: pending.qrCode, amount: pending.amount, plan });
    }

    const origin = process.env.SITE_ORIGIN.replace(/\/$/, '');
    const base = `${origin}/dashboard/${request.wedding._id}`;
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderCode = await uniqueOrderCode();
      const data = await payos.createPaymentLink({
        orderCode,
        amount,
        description: `TC${orderCode}`.slice(0, 25),
        cancelUrl: `${base}?payment=cancel&orderCode=${orderCode}`,
        returnUrl: `${base}?payment=success&orderCode=${orderCode}`
      });
      try {
        await Order.create({ orderCode, wedding: request.wedding._id, user: request.user.sub, plan, amount, checkoutUrl: data.checkoutUrl, qrCode: data.qrCode, paymentLinkId: data.paymentLinkId });
        return response.status(201).json({ orderCode, checkoutUrl: data.checkoutUrl, qrCode: data.qrCode, amount, plan });
      } catch (error) {
        if (error.code !== '23505' || attempt === 4) throw error;
      }
    }
  } catch (error) {
    next(error);
  }
});

router.get('/', async (request, response, next) => {
  try {
    const orders = await Order.find({ wedding: request.wedding._id }).sort({ createdAt: -1 }).lean();
    response.json(orders.map(orderView));
  } catch (error) {
    next(error);
  }
});

router.post('/:orderCode/sync', async (request, response, next) => {
  try {
    let order = await Order.findOne({ wedding: request.wedding._id, orderCode: Number(request.params.orderCode) });
    if (!order) return response.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'paid') {
      const status = await payos.getPaymentStatus(order.orderCode);
      if (status.status === 'PAID' && status.amountPaid >= order.amount) {
        order = await applyPaidOrder(order);
      } else if (['CANCELLED', 'EXPIRED'].includes(status.status)) {
        order.status = status.status.toLowerCase();
        await order.save();
      }
    }
    response.json({ status: order.status, plan: order.plan });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
