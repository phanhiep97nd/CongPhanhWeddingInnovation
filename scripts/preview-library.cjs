// Isolated local preview: no .env is read and no production database is touched.
const { createRequire } = require('node:module');
const path = require('node:path');
const fs = require('node:fs/promises');
const fromApi = createRequire(path.join(__dirname, '../api/package.json'));
const { PGlite } = fromApi('@electric-sql/pglite');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = require('node:crypto').randomBytes(32).toString('hex');
(async () => {
  const persistent = process.argv.includes('--persistent');
  const local = path.join(__dirname, '../.local-test');
  if (persistent) await fs.mkdir(local, { recursive: true });
  const database = new PGlite(persistent ? path.join(local, 'database') : undefined);
  const db = require('../api/db'); db.useTestDatabase(database); await db.migrate();
  if (process.argv.includes('--seed-admin')) {
    if (!persistent) throw new Error('--seed-admin requires --persistent');
    const User = require('../api/models/User');
    const accountFile = path.join(local, 'account.json');
    const account = await fs.readFile(accountFile, 'utf8').then(JSON.parse).catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return { email: 'admin-test@hythiep.local', password: require('node:crypto').randomBytes(24).toString('base64url') };
    });
    let user = await User.findOne({ email: account.email });
    if (!user) user = await User.create({ email: account.email, name: 'Quản trị kiểm thử', passwordHash: await fromApi('bcryptjs').hash(account.password, 10), role: 'admin', status: 'active', defaultWeddingPlan: 'premium' });
    else { user.role = 'admin'; user.status = 'active'; user.defaultWeddingPlan = 'premium'; await user.save(); }
    await fs.writeFile(accountFile, JSON.stringify(account, null, 2));
    await fs.writeFile(path.join(local, 'TAI-KHOAN-TEST.txt'), `Trang đăng nhập: http://localhost:3100/login\nEmail: ${account.email}\nMật khẩu: ${account.password}\nQuyền: admin; trạng thái active; thiệp mới mặc định Premium.\nDữ liệu test lưu cục bộ trong .local-test/database, giữ lại khi khởi động lại.\nKhởi động API: node scripts/preview-library.cjs --persistent --seed-admin\nKhông dùng tài khoản này trên môi trường production.\n`);
    console.log('Local test admin ready; credentials: .local-test/TAI-KHOAN-TEST.txt');
  }
  const server = require('../api/app').listen(3101, '127.0.0.1', () => console.log(`Isolated API http://127.0.0.1:3101; ${persistent ? 'persistent local test data' : 'data resets on restart'}`));
  const close = () => server.close(async () => { await database.close(); process.exit(0); });
  process.on('SIGINT', close); process.on('SIGTERM', close);
})();
