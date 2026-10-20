const mongoose = require('mongoose');

const SECTION_KEYS = ['story', 'timeline', 'gallery', 'info', 'rsvp', 'photoWall', 'rooms', 'dressCode'];
const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  published: { type: Boolean, default: true },
  couple: {
    groom: { type: String, default: '' },
    bride: { type: String, default: '' },
    groomFull: { type: String, default: '' },
    brideFull: { type: String, default: '' }
  },
  eventDate: { type: Date, default: null },
  dateText: { type: String, default: '' },
  venue: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    mapUrl: { type: String, default: '' }
  },
  coverImage: { type: String, default: '' },
  ogImage: { type: String, default: '' },
  story: {
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    image: { type: String, default: '' }
  },
  timeline: { type: Array, default: [] },
  gallery: { type: Array, default: [] },
  musicUrl: { type: String, default: '' },
  zaloGroupLink: { type: String, default: '' },
  dressCode: {
    note: { type: String, default: '' },
    colors: { type: [String], default: [] }
  },
  sections: {
    type: [new mongoose.Schema({ key: String, enabled: Boolean }, { _id: false })],
    default: () => SECTION_KEYS.map(key => ({ key, enabled: true }))
  },
  customSections: { type: Array, default: [] },
  meta: {
    title: { type: String, default: '' },
    description: { type: String, default: '' }
  },
  theme: { primary: { type: String, default: '#b76e79' } }
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('Wedding', schema);
module.exports.SECTION_KEYS = SECTION_KEYS;
