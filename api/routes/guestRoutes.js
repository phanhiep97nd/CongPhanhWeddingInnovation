const express = require('express');
const Guest = require('../models/Guest');
const auth = require('../middleware/auth');

const router = express.Router();

// ─── PUBLIC ROUTES (no auth) ─────────────────────────────────────────────────

// GET /guests/rooms - get all confirmed guests (status=yes), sorted: assigned rooms first
router.get('/rooms', async (req, res) => {
  try {
    const guests = await Guest.find({ status: 'yes' })
      .select('invitationName room')
      .sort({ room: 1, invitationName: 1 });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /guests/:id - get one guest by ID (for public wedding site)
router.get('/:id', async (req, res) => {
  try {
    const guest = await Guest.findById(req.params.id).select(
      'name invitationName phone status guestCount joinGroup pickupPoint room note'
    );
    if (!guest) return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    res.json(guest);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    }
    res.status(500).json({ message: err.message });
  }
});

// PUT /guests/:id/rsvp - public RSVP update from wedding site
router.put('/:id/rsvp', async (req, res) => {
  const { status, guestCount, joinGroup, pickupPoint, phone } = req.body;

  // Validate status
  if (status && !['pending', 'yes', 'no'].includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
  }

  try {
    const update = {};
    if (status !== undefined) update.status = status;
    if (guestCount !== undefined) update.guestCount = guestCount;
    if (joinGroup !== undefined) update.joinGroup = joinGroup;
    if (pickupPoint !== undefined) update.pickupPoint = pickupPoint;
    if (phone) update.phone = phone;

    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('name invitationName status guestCount joinGroup pickupPoint');

    if (!guest) return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    res.json(guest);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    }
    res.status(500).json({ message: err.message });
  }
});

// ─── ADMIN-PROTECTED ROUTES ──────────────────────────────────────────────────

// GET /guests - get all guests (full data)
router.get('/', auth, async (req, res) => {
  try {
    const guests = await Guest.find().sort({ createdAt: -1 });
    res.json(guests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /guests - create a new guest
router.post('/', auth, async (req, res) => {
  const { name, invitationName, phone, status, guestCount, joinGroup, pickupPoint, room, note } = req.body;

  if (!name || !invitationName) {
    return res.status(400).json({ message: 'Tên thực và tên trong thiệp là bắt buộc' });
  }

  try {
    const guest = new Guest({
      name,
      invitationName,
      phone: phone || '',
      status: status || 'pending',
      guestCount: guestCount ?? 1,
      joinGroup: joinGroup ?? false,
      pickupPoint: pickupPoint || '',
      room: room || '',
      note: note || '',
    });
    await guest.save();
    res.status(201).json(guest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /guests/:id - full update (admin only)
router.put('/:id', auth, async (req, res) => {
  const { name, invitationName, phone, status, guestCount, joinGroup, pickupPoint, room, note } = req.body;

  if (!name || !invitationName) {
    return res.status(400).json({ message: 'Tên thực và tên trong thiệp là bắt buộc' });
  }

  try {
    const guest = await Guest.findByIdAndUpdate(
      req.params.id,
      { $set: { name, invitationName, phone, status, guestCount, joinGroup, pickupPoint, room, note } },
      { new: true, runValidators: true }
    );
    if (!guest) return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    res.json(guest);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    }
    res.status(500).json({ message: err.message });
  }
});

// DELETE /guests/:id - delete guest (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const guest = await Guest.findByIdAndDelete(req.params.id);
    if (!guest) return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    res.json({ message: 'Đã xóa khách mời' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Không tìm thấy khách mời' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
