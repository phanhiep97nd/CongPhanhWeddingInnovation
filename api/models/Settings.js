const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  prices: {
    basic: { type: Number, default: 30000 },
    premium: { type: Number, default: 99000 }
  },
  freeGuestLimit: { type: Number, default: 10 },
  freeGalleryLimit: { type: Number, default: 6 },
  paidGalleryLimit: { type: Number, default: 50 },
  freeExpiryDays: { type: Number, default: 30 }
}, { minimize: false });

const Settings = mongoose.model('Settings', schema);
let cached;
let cachedUntil = 0;

async function getSettings() {
  if (cached && Date.now() < cachedUntil) return cached;
  cached = await Settings.findById('global').lean();
  if (!cached) cached = (await Settings.create({ _id: 'global' })).toObject();
  cachedUntil = Date.now() + 30000;
  return cached;
}

function invalidateSettings() {
  cached = null;
  cachedUntil = 0;
}

module.exports = { Settings, getSettings, invalidateSettings };
