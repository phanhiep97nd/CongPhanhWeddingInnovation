const Order = require('../db/model').model('Order');
const db = require('../db');
Order.monthlyRevenue = async () => (await db.query(`
  SELECT to_char("paidAt" AT TIME ZONE 'UTC', 'YYYY-MM') AS _id,
    sum(amount)::float8 AS amount, count(*)::int AS orders
  FROM orders WHERE status = 'paid' GROUP BY 1`)).rows;
module.exports = Order;
