const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  status: { type: String, enum: ['active', 'locked'], default: 'active' }
}, { timestamps: true });

module.exports = mongoose.model('User', schema);
