const express = require('express');
const Guest = require('../models/Guest');
const { fail, pick } = require('../lib/common');
const { guestFields } = require('../lib/validators');
const { serialize } = require('../lib/serialize');
const { createGuest, createGuests } = require('../lib/guestCodes');

const router = express.Router({ mergeParams: true });

router.get('/', async (request, response, next) => {
  try {
    const guests = await Guest.find({ wedding: request.wedding._id }).sort({ createdAt: -1 }).lean();
    response.json(guests.map(guest => serialize(guest, ['wedding'])));
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const data = pick(request.body, guestFields);
    if (!data.invitationName) fail('Tên trên thiệp là bắt buộc');
    data.name = data.name || data.invitationName;
    const guest = await createGuest(request.wedding._id, data);
    response.status(201).json(serialize(guest, ['wedding']));
  } catch (error) {
    next(error);
  }
});

router.post('/bulk', async (request, response, next) => {
  try {
    const incoming = request.body.guests;
    if (!Array.isArray(incoming) || incoming.length < 1 || incoming.length > 500) {
      fail('Danh sách phải có từ 1 đến 500 khách');
    }

    const allowed = {
      invitationName: guestFields.invitationName,
      name: guestFields.name,
      phone: guestFields.phone,
      note: guestFields.note
    };
    const entries = incoming.map(item => {
      const data = pick(item, allowed);
      if (!data.invitationName) fail('Tên trên thiệp là bắt buộc');
      data.name = data.name || data.invitationName;
      return data;
    });

    const guests = await createGuests(request.wedding._id, entries);
    response.status(201).json(guests.map(guest => serialize(guest, ['wedding'])));
  } catch (error) {
    next(error);
  }
});

router.put('/:guestId', async (request, response, next) => {
  try {
    const data = pick(request.body, guestFields);
    const guest = await Guest.findOneAndUpdate(
      { _id: request.params.guestId, wedding: request.wedding._id },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!guest) return response.status(404).json({ message: 'Không tìm thấy khách mời' });
    response.json(serialize(guest, ['wedding']));
  } catch (error) {
    next(error);
  }
});

router.delete('/:guestId', async (request, response, next) => {
  try {
    const guest = await Guest.findOneAndDelete({ _id: request.params.guestId, wedding: request.wedding._id });
    if (!guest) return response.status(404).json({ message: 'Không tìm thấy khách mời' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
