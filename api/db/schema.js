const SECTION_KEYS = ['story', 'timeline', 'gallery', 'info', 'rsvp', 'photoWall', 'rooms', 'dressCode', 'giftBox'];
// Scalar relations are SQL foreign keys; flexible invitation content uses JSONB.
const schemas = {
  User: {
    table: 'users', fields: ['email', 'passwordHash', 'name', 'role', 'status'],
    defaults: { role: 'user', status: 'active' }, required: ['email', 'passwordHash', 'name']
  },
  Wedding: {
    table: 'weddings', fields: ['owner', 'slug', 'slugAliases', 'plan', 'planActivatedAt', 'template', 'viewModes', 'giftBox', 'published', 'couple', 'eventDate', 'eventTime', 'dateText', 'venue', 'coverImage', 'ogImage', 'story', 'timeline', 'gallery', 'musicUrl', 'zaloGroupLink', 'dressCode', 'sections', 'customSections', 'meta', 'theme'],
    defaults: {
      slugAliases: [], plan: 'free', planActivatedAt: null, template: 'classic', viewModes: ['3d', 'mixed', 'normal'],
      giftBox: { note: '', accounts: [] }, published: true,
      couple: { groom: '', bride: '', groomFull: '', brideFull: '' }, eventDate: null, eventTime: '', dateText: '',
      venue: { name: '', address: '', mapUrl: '' }, coverImage: '', ogImage: '', story: { title: '', body: '', image: '' },
      timeline: [], gallery: [], musicUrl: '', zaloGroupLink: '', dressCode: { note: '', colors: [] },
      sections: SECTION_KEYS.map(key => ({ key, enabled: true })), customSections: [], meta: { title: '', description: '' }, theme: { primary: '#b76e79' }
    }, required: ['owner', 'slug'],
    json: ['slugAliases', 'viewModes', 'giftBox', 'couple', 'venue', 'story', 'timeline', 'gallery', 'dressCode', 'sections', 'customSections', 'meta', 'theme'],
    dates: ['planActivatedAt', 'eventDate'], relations: { owner: 'User' }
  },
  Guest: {
    table: 'guests', fields: ['wedding', 'code', 'name', 'invitationName', 'phone', 'status', 'guestCount', 'joinGroup', 'pickupPoint', 'room', 'note'],
    defaults: { code: null, phone: '', status: 'pending', guestCount: 1, joinGroup: false, pickupPoint: '', room: '', note: '' },
    required: ['wedding', 'name', 'invitationName'], relations: { wedding: 'Wedding' }
  },
  Photo: {
    table: 'photos', fields: ['wedding', 'url', 'caption', 'author'], defaults: { caption: '', author: 'Ẩn danh' },
    required: ['wedding', 'url'], relations: { wedding: 'Wedding' }
  },
  Order: {
    table: 'orders', fields: ['orderCode', 'wedding', 'user', 'plan', 'amount', 'status', 'method', 'checkoutUrl', 'qrCode', 'paymentLinkId', 'note', 'paidAt'],
    defaults: { status: 'pending', method: 'payos', checkoutUrl: '', qrCode: '', paymentLinkId: '', note: '', paidAt: null },
    required: ['orderCode', 'wedding', 'user', 'plan', 'amount'], dates: ['paidAt'], relations: { wedding: 'Wedding', user: 'User' }
  },
  Settings: {
    table: 'settings', fields: ['prices', 'freeGuestLimit', 'freeGalleryLimit', 'paidGalleryLimit', 'freeExpiryDays'],
    defaults: { prices: { basic: 30000, premium: 99000 }, freeGuestLimit: 10, freeGalleryLimit: 6, paidGalleryLimit: 50, freeExpiryDays: 30 },
    json: ['prices'], timestamps: false
  }
};
module.exports = { schemas, SECTION_KEYS };
