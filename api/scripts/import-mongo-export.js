const fs = require('node:fs');
const path = require('node:path');
const db = require('../db');
const { model } = require('../db/model');

const collections = [['users', 'User'], ['weddings', 'Wedding'], ['guests', 'Guest'], ['photos', 'Photo'], ['orders', 'Order'], ['settings', 'Settings']];

function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (!value || typeof value !== 'object') return value;
  if ('$oid' in value) return value.$oid;
  if ('$date' in value) return new Date(typeof value.$date === 'object' ? Number(value.$date.$numberLong) : value.$date);
  for (const key of ['$numberLong', '$numberInt', '$numberDouble', '$numberDecimal']) {
    if (key in value) {
      const number = Number(value[key]);
      if (!Number.isFinite(number) || (key === '$numberLong' && !Number.isSafeInteger(number))) throw new Error('Giá trị số nằm ngoài phạm vi an toàn');
      return number;
    }
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
}

function readExports(directory) {
  return Object.fromEntries(collections.map(([collection]) => {
    const filename = path.join(directory, `${collection}.json`);
    const text = fs.readFileSync(filename, 'utf8').trim();
    const documents = !text ? [] : text.startsWith('[') ? JSON.parse(text) : text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
    if (!Array.isArray(documents)) throw new Error(`File không phải danh sách: ${collection}.json`);
    return [collection, documents.map(decode)];
  }));
}

async function importDocuments(exports, { apply = false } = {}) {
  await db.migrate();
  const counts = {};
  const dryRun = new Error('DRY_RUN_ROLLBACK');
  try {
    await db.transaction(async () => {
      // Destination must be empty: do not silently merge or overwrite production.
      await db.query('LOCK TABLE users, weddings, guests, photos, orders, settings IN ACCESS EXCLUSIVE MODE');
      for (const [, name] of collections) if (await model(name).countDocuments()) {
        throw new Error('Database đích phải trống. Dừng API/web và dùng database mới trước khi import.');
      }
      for (const [collection, name] of collections) {
        const entries = exports[collection];
        if (!Array.isArray(entries)) throw new Error(`Thiếu dữ liệu collection ${collection}`);
        for (const entry of entries) {
          if (!entry._id) throw new Error(`Thiếu _id trong ${collection}`);
          if (['guests', 'photos'].includes(collection) && !entry.wedding) {
            throw new Error('Dữ liệu legacy thiếu wedding: cần gán đúng thiệp/chủ sở hữu trên bản sao trước khi import.');
          }
          await model(name).create(entry);
        }
        counts[collection] = entries.length;
      }
      if (!apply) throw dryRun;
    });
  } catch (error) { if (error !== dryRun) throw error; }
  return counts;
}

if (require.main === module) {
  require('dotenv').config();
  const directory = process.argv[2];
  if (!directory || process.argv.slice(3).some(arg => arg !== '--apply')) {
    console.error('Usage: npm run db:import-mongo -- /path/to/export [--apply]');
    process.exitCode = 1;
  } else {
    const apply = process.argv.includes('--apply');
    Promise.resolve().then(() => importDocuments(readExports(directory), { apply }))
      .then(counts => console.log(apply ? 'Imported:' : 'Dry run OK (đã rollback):', counts))
      .catch(error => { console.error('Import thất bại; không ghi dữ liệu:', error.message); process.exitCode = 1; })
      .finally(() => db.close());
  }
}

module.exports = { decode, readExports, importDocuments };
