const db = require('../db');
const Settings = require('../db/model').model('Settings');
let cached;
let cachedUntil = 0;

async function getSettings() {
  if (cached && Date.now() < cachedUntil) return cached;
  cached = await Settings.findById('global').lean();
  if (!cached) {
    await db.query("INSERT INTO settings (_id) VALUES ('global') ON CONFLICT (_id) DO NOTHING");
    cached = await Settings.findById('global').lean();
  }
  cachedUntil = Date.now() + 30000;
  return cached;
}

function invalidateSettings() {
  cached = null;
  cachedUntil = 0;
}

module.exports = { Settings, getSettings, invalidateSettings };
