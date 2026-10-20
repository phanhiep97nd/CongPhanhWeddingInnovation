const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
  url: { type: String, required: true },
  caption: { type: String, default: '' },
  author: { type: String, default: 'Ẩn danh' }
}, { timestamps: true });

schema.index({ wedding: 1, createdAt: -1 });

module.exports = mongoose.model('Photo', schema);
