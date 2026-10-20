require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Wedding = require('../models/Wedding');
const Guest = require('../models/Guest');
const Photo = require('../models/Photo');
const { code } = require('../lib/common');

async function run() {
  if (!process.env.MONGO_URI || !process.env.LEGACY_OWNER_EMAIL) {
    throw new Error('Cần MONGO_URI và LEGACY_OWNER_EMAIL');
  }
  await mongoose.connect(process.env.MONGO_URI);

  const owner = await User.findOne({ email: process.env.LEGACY_OWNER_EMAIL.toLowerCase().trim() });
  if (!owner) {
    throw new Error('Chưa có tài khoản chủ sở hữu LEGACY_OWNER_EMAIL. Hãy đăng ký tài khoản trước khi di chuyển dữ liệu.');
  }

  let wedding = await Wedding.findOne({ slug: 'congphanh' });
  if (!wedding) {
    wedding = await Wedding.create({
      owner: owner._id,
      slug: 'congphanh',
      couple: { groom: 'Minh Công', bride: 'Phương Anh' },
      dateText: '03 · 04 · 2026',
      venue: { name: 'Aman Villa' },
      zaloGroupLink: 'https://zalo.me/g/hqjq6rzs0b5ggcijwde5',
      coverImage: 'https://congphanh.vercel.app/images/DSCF7860.jpg'
    });
  } else if (String(wedding.owner) !== String(owner._id)) {
    throw new Error('Thiệp congphanh đang thuộc tài khoản khác');
  }

  // Collection updates assign the required wedding field to legacy records before document validation.
  await Guest.updateMany({ wedding: { $exists: false } }, { $set: { wedding: wedding._id } });
  await Photo.updateMany({ wedding: { $exists: false } }, { $set: { wedding: wedding._id } });

  const missingCodes = await Guest.find({
    wedding: wedding._id,
    $or: [{ code: { $exists: false } }, { code: null }, { code: '' }]
  });
  for (const guest of missingCodes) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        guest.code = code();
        await guest.save();
        break;
      } catch (error) {
        if (error.code !== 11000 || attempt === 4) throw error;
      }
    }
  }
  console.log('Đã di chuyển dữ liệu cũ');
}

run().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
