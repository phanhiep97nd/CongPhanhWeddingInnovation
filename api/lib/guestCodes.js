const Guest = require('../models/Guest');
const { newId } = require('../db/model');
const { code } = require('./common');
async function createGuest(wedding, data) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await Guest.create({ wedding, code: code(), ...data }); }
    catch (error) { if (error.code !== '23505' || attempt === 4) throw error; }
  }
}
async function createGuests(wedding, entries) {
  const documents = entries.map(entry => ({ _id: newId(), wedding, ...entry, code: code() }));
  // PostgreSQL multi-row INSERT is atomic: a collision never leaves a partial list.
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await Guest.insertMany(documents); }
    catch (error) {
      if (error.code !== '23505' || attempt === 4) throw error;
      for (const document of documents) document.code = code();
    }
  }
}
module.exports = { createGuest, createGuests };
