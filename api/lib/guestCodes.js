const mongoose = require('mongoose');
const Guest = require('../models/Guest');
const { code } = require('./common');

async function createGuest(wedding, data) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Guest.create({ wedding, code: code(), ...data });
    } catch (error) {
      if (error.code !== 11000 || attempt === 4) throw error;
    }
  }
}

async function createGuests(wedding, entries) {
  const documents = entries.map(entry => ({
    _id: new mongoose.Types.ObjectId(),
    wedding,
    code: code(),
    ...entry
  }));
  let pending = documents;

  for (let attempt = 0; attempt < 5 && pending.length; attempt++) {
    try {
      await Guest.insertMany(pending, { ordered: false });
      pending = [];
    } catch (error) {
      const failures = error.writeErrors;
      if (!Array.isArray(failures) || failures.some(failure => (failure.err?.code ?? failure.code) !== 11000) || attempt === 4) {
        throw error;
      }

      pending = failures.map(failure => {
        const document = pending[failure.index];
        document.code = code();
        return document;
      });
    }
  }

  const created = await Guest.find({ _id: { $in: documents.map(document => document._id) } }).lean();
  const byId = new Map(created.map(guest => [String(guest._id), guest]));
  return documents.map(document => byId.get(String(document._id)));
}

module.exports = { createGuest, createGuests };
