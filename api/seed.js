require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Wedding = require('./models/Wedding');
const Guest = require('./models/Guest');
const { createGuest } = require('./lib/guestCodes');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('Thiếu MONGO_URI');
  await mongoose.connect(process.env.MONGO_URI);

  const email = 'demo@example.com';
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email,
      name: 'Tài khoản demo',
      passwordHash: await bcrypt.hash(process.env.SEED_PASSWORD || 'demo12345', 10)
    });
  }

  let wedding = await Wedding.findOne({ slug: 'demo' });
  if (!wedding) {
    wedding = await Wedding.create({
      owner: user._id,
      slug: 'demo',
      couple: { groom: 'Minh', bride: 'Lan' },
      dateText: '01 · 01 · 2027',
      venue: { name: 'Vườn Hồng' }
    });
  }

  const guests = [
    { invitationName: 'Anh An', status: 'yes', guestCount: 2 },
    { invitationName: 'Chị Bình', status: 'pending' },
    { invitationName: 'Gia đình Cường', status: 'no' }
  ];
  for (const guest of guests) {
    if (!await Guest.exists({ wedding: wedding._id, invitationName: guest.invitationName })) {
      await createGuest(wedding._id, { name: guest.invitationName, ...guest });
    }
  }
  console.log('Đã tạo dữ liệu demo');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
