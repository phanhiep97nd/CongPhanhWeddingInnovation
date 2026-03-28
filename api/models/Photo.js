const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  url:       { type: String, required: true },
  caption:   { type: String, default: '' },
  author:    { type: String, default: 'Ẩn danh' },
}, { timestamps: true });

module.exports = mongoose.model('Photo', photoSchema);
