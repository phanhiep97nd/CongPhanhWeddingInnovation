require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function main() {
  const email = String(process.argv[2] || '').trim().toLowerCase();
  if (!email) throw new Error('Usage: npm run make-admin -- <email>');
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOneAndUpdate({ email }, { $set: { role: 'admin' } }, { new: true });
  if (!user) throw new Error('Không tìm thấy người dùng');
  process.stdout.write(`Admin: ${user.email}\n`);
}

main().catch(error => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
