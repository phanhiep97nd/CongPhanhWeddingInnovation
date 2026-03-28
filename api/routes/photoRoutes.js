const express = require('express');
const router = express.Router();
const Photo = require('../models/Photo');

// GET /photos — newest first, max 200
router.get('/', async (req, res) => {
  try {
    const photos = await Photo.find().sort({ createdAt: -1 }).limit(200);
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /photos — save new photo metadata
router.post('/', async (req, res) => {
  try {
    const { url, caption, author } = req.body;
    if (!url) return res.status(400).json({ message: 'url is required' });
    const photo = await Photo.create({ url, caption: caption || '', author: author || 'Ẩn danh' });
    res.status(201).json(photo);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
