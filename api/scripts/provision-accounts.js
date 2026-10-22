const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const db = require('../db');
const User = require('../models/User');
const Wedding = require('../models/Wedding');
const Order = require('../models/Order');
const { uniqueOrderCode } = require('../lib/orders');

function email(value) {
  const result = String(value || '').trim().toLowerCase();
  if (result.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new Error('Email không hợp lệ');
  return result;
}

async function provisionAccounts({ adminEmail = 'admin@hythiep.net', creatorEmail = 'creator@hythiep.net' } = {}) {
  adminEmail = email(adminEmail);
  creatorEmail = email(creatorEmail);
  if (adminEmail === creatorEmail) throw new Error('Hai tài khoản phải có email khác nhau');
  if ((process.env.ADMIN_EMAILS || '').split(',').some(value => value.trim().toLowerCase() === creatorEmail)) {
    throw new Error('Email creator nằm trong ADMIN_EMAILS. Bỏ email này khỏi cấu hình để giữ tài khoản không có quyền quản trị.');
  }
  await db.migrate();
  return db.transaction(async () => {
    await db.query('SELECT pg_advisory_xact_lock(784291064)');
    const result = [];
    for (const account of [
      { email: adminEmail, name: 'Quản trị Hỷ Thiệp', role: 'admin' },
      { email: creatorEmail, name: 'Người tạo thiệp Hỷ Thiệp', role: 'user' }
    ]) {
      let user = await User.findOne({ email: account.email });
      let password = null;
      const created = !user;
      if (user) {
        if (user.status === 'locked') throw new Error(`Tài khoản ${account.email} đang bị khóa; cần xử lý trước khi cấp quyền`);
        if (account.role === 'user' && user.role === 'admin') throw new Error(`Email ${account.email} đã là admin; chọn email creator khác`);
        user.role = account.role;
        user.defaultWeddingPlan = 'premium';
        await user.save();
      } else {
        password = crypto.randomBytes(24).toString('base64url');
        user = await User.create({ ...account, defaultWeddingPlan: 'premium', passwordHash: await bcrypt.hash(password, 12) });
      }
      // Existing invitations of these accounts get the same full feature set.
      const weddings = await Wedding.find({ owner: user._id, plan: { $ne: 'premium' } });
      for (const wedding of weddings) {
        await Wedding.updateOne({ _id: wedding._id }, { $set: { plan: 'premium', planActivatedAt: new Date() } });
        await Order.create({ orderCode: await uniqueOrderCode(), wedding: wedding._id, user: user._id, plan: 'premium', amount: 0, status: 'paid', method: 'manual', paidAt: new Date(), note: 'Cấp đầy đủ tính năng qua provision-accounts' });
      }
      result.push({ email: user.email, role: user.role, created, password, upgradedWeddings: weddings.length });
    }
    return result;
  });
}

if (require.main === module) {
  require('dotenv').config();
  const args = process.argv.slice(2);
  const options = {};
  let invalid = false;
  for (let index = 0; index < args.length; index += 2) {
    if (!['--admin-email', '--creator-email'].includes(args[index]) || !args[index + 1]) { invalid = true; break; }
    options[args[index] === '--admin-email' ? 'adminEmail' : 'creatorEmail'] = args[index + 1];
  }
  if (invalid) {
    console.error('Usage: npm run provision-accounts -- [--admin-email email] [--creator-email email]');
    process.exitCode = 1;
  } else {
    provisionAccounts(options).then(accounts => {
      for (const account of accounts) {
        console.log(`\nEmail: ${account.email}\nQuyền: ${account.role}; thiệp mới: premium\nThiệp cũ được nâng cấp: ${account.upgradedWeddings}`);
        console.log(account.created ? `Mật khẩu (chỉ hiện khi tạo mới): ${account.password}` : 'Tài khoản đã có: giữ nguyên mật khẩu.');
      }
    }).catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.close());
  }
}

module.exports = { provisionAccounts };
