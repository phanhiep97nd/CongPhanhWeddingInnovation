const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  orderCode: { type: Number, required: true, unique: true, min: 1, max: Number.MAX_SAFE_INTEGER - 1, validate: Number.isInteger },
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  plan: { type: String, enum: ['basic', 'premium', 'free'], required: true },
  amount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'paid', 'cancelled', 'expired'], default: 'pending' },
  method: { type: String, enum: ['payos', 'manual'], default: 'payos' },
  checkoutUrl: { type: String, default: '' },
  qrCode: { type: String, default: '' },
  paymentLinkId: { type: String, default: '' },
  note: { type: String, default: '' },
  paidAt: { type: Date, default: null }
}, { timestamps: true });

schema.index({ wedding: 1, createdAt: -1 });
schema.index({ user: 1 });
schema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', schema);
