const FEATURES = {
  unlimitedGuests: 'basic',
  removeBranding: 'basic',
  largeGallery: 'basic',
  excelExport: 'basic',
  guestQr: 'basic',
  giftBox: 'premium',
  photoWall: 'premium',
  customMusic: 'premium',
  permanent: 'premium',
  premiumTemplates: 'premium'
};

const PLAN_RANK = { free: 0, basic: 1, premium: 2 };

function requiredPlanFor(feature) {
  return FEATURES[feature];
}

function entitlementsFor(plan) {
  return Object.fromEntries(Object.entries(FEATURES).map(([feature, required]) => [
    feature,
    PLAN_RANK[plan] >= PLAN_RANK[required]
  ]));
}

function limitsFor(plan, settings) {
  return {
    guests: ['basic', 'premium'].includes(plan) ? null : settings.freeGuestLimit,
    gallery: ['basic', 'premium'].includes(plan) ? settings.paidGalleryLimit : settings.freeGalleryLimit
  };
}

function expiresAt(wedding, settings) {
  if (wedding.plan === 'premium') return null;
  const base = wedding.eventDate || wedding.createdAt;
  if (!base) return null;
  const days = wedding.eventDate ? settings.freeExpiryDays : 365;
  return new Date(new Date(base).getTime() + days * 86400000);
}

function isExpired(wedding, settings, now = new Date()) {
  const expiry = expiresAt(wedding, settings);
  return !!expiry && new Date(now) > expiry;
}

function upgradeAmount(fromPlan, toPlan, prices) {
  if (!(toPlan in PLAN_RANK) || PLAN_RANK[toPlan] <= PLAN_RANK[fromPlan]) return 0;
  return (prices[toPlan] || 0) - (prices[fromPlan] || 0);
}

function paywall(feature) {
  return {
    status: 402,
    body: {
      message: 'Vui lòng nâng cấp gói để sử dụng tính năng này',
      code: 'PLAN_REQUIRED',
      feature,
      requiredPlan: requiredPlanFor(feature)
    }
  };
}

module.exports = { FEATURES, PLAN_RANK, entitlementsFor, requiredPlanFor, limitsFor, expiresAt, isExpired, upgradeAmount, paywall };
