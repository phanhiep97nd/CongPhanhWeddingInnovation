const express = require('express');
const Order = require('../models/Order');
const payos = require('../lib/payos');
const { applyPaidOrder } = require('../lib/orders');

const router = express.Router();

router.post('/webhook', async (request, response, next) => {
  try {
    if (!payos.verifyWebhook(request.body)) return response.status(400).json({ message: 'Chữ ký không hợp lệ' });
    const data = request.body.data;
    const order = await Order.findOne({ orderCode: data.orderCode });
    if (order && data.code === '00' && Number(data.amount) >= order.amount) {
      await applyPaidOrder(order);
    }
    response.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
