/**
 * Seed script – chạy 1 lần để tạo dummy data
 * Usage: node api/seed.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const Guest = require('./models/Guest');

const GUESTS = [
  {
    name: 'Nguyễn Văn An',
    invitationName: 'Anh An & gia đình',
    phone: '0901234567',
    status: 'yes',
    guestCount: 2,
    joinGroup: true,
    pickupPoint: 'BigC Thăng Long',
    room: 'Villa 01',
    note: 'Đặt phòng đôi',
  },
  {
    name: 'Trần Thị Bình',
    invitationName: 'Chị Bình',
    phone: '0912345678',
    status: 'yes',
    guestCount: 1,
    joinGroup: true,
    pickupPoint: 'Hanoi Central Point',
    room: 'Villa 01',
    note: '',
  },
  {
    name: 'Lê Hoàng Cường',
    invitationName: 'Cường & Linh',
    phone: '0923456789',
    status: 'yes',
    guestCount: 2,
    joinGroup: false,
    pickupPoint: '',
    room: 'Villa 02',
    note: 'Tự lái xe',
  },
  {
    name: 'Phạm Thị Dung',
    invitationName: 'Chị Dung',
    phone: '0934567890',
    status: 'pending',
    guestCount: 1,
    joinGroup: false,
    pickupPoint: '',
    room: 'Villa 02',
    note: '',
  },
  {
    name: 'Hoàng Minh Đức',
    invitationName: 'Đức & Hoa',
    phone: '0945678901',
    status: 'yes',
    guestCount: 2,
    joinGroup: true,
    pickupPoint: 'BigC Thăng Long',
    room: 'Villa 03',
    note: '',
  },
  {
    name: 'Vũ Thị Hà',
    invitationName: 'Chị Hà',
    phone: '0956789012',
    status: 'no',
    guestCount: 1,
    joinGroup: false,
    pickupPoint: '',
    room: '',
    note: 'Bận công tác nước ngoài',
  },
  {
    name: 'Đặng Quốc Hùng',
    invitationName: 'Anh Hùng & Yến',
    phone: '0967890123',
    status: 'yes',
    guestCount: 2,
    joinGroup: true,
    pickupPoint: 'Hanoi Central Point',
    room: 'Villa 03',
    note: '',
  },
  {
    name: 'Bùi Thị Lan',
    invitationName: 'Chị Lan',
    phone: '0978901234',
    status: 'pending',
    guestCount: 1,
    joinGroup: false,
    pickupPoint: '',
    room: 'Villa 04',
    note: 'Chờ xác nhận lại',
  },
  {
    name: 'Ngô Xuân Mạnh',
    invitationName: 'Mạnh & Phương',
    phone: '0989012345',
    status: 'yes',
    guestCount: 2,
    joinGroup: true,
    pickupPoint: 'BigC Thăng Long',
    room: 'Villa 04',
    note: '',
  },
  {
    name: 'Đinh Thị Nga',
    invitationName: 'Chị Nga',
    phone: '0990123456',
    status: 'yes',
    guestCount: 1,
    joinGroup: false,
    pickupPoint: '',
    room: 'Villa 05',
    note: 'Phòng đơn',
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    const existing = await Guest.countDocuments();
    if (existing > 0) {
      console.log(`DB đã có ${existing} khách mời. Bỏ qua seed.`);
      console.log('Nếu muốn seed lại, hãy xóa dữ liệu cũ trước.');
      process.exit(0);
    }

    const result = await Guest.insertMany(GUESTS);
    console.log(`✅ Đã tạo ${result.length} khách mời thành công!`);
    result.forEach(g => {
      console.log(`  - ${g.invitationName} (${g.status}) — ID: ${g._id}`);
    });
  } catch (err) {
    console.error('Seed error:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
