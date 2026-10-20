import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { FEATURES, entitlementsFor, requiredPlanFor, limitsFor, expiresAt, isExpired, upgradeAmount, paywall } = require('../lib/plans');

const settings = {
  prices: { basic: 30000, premium: 99000 },
  freeGuestLimit: 10,
  freeGalleryLimit: 6,
  paidGalleryLimit: 50,
  freeExpiryDays: 30
};

describe('plan functions', () => {
  for (const [feature, required] of Object.entries(FEATURES)) {
    it(`requires ${required} for ${feature}`, () => {
      expect(requiredPlanFor(feature)).toBe(required);
    });

    it(`entitles the correct plans to ${feature}`, () => {
      expect(entitlementsFor('free')[feature]).toBe(false);
      expect(entitlementsFor('basic')[feature]).toBe(required === 'basic');
      expect(entitlementsFor('premium')[feature]).toBe(true);
    });

    it(`provides the correct paywall for ${feature}`, () => {
      expect(paywall(feature)).toMatchObject({ status: 402, body: { code: 'PLAN_REQUIRED', feature, requiredPlan: required } });
    });
  }

  it('has exactly ten feature keys', () => expect(Object.keys(FEATURES)).toHaveLength(10));
  it('limits free guests and gallery', () => expect(limitsFor('free', settings)).toEqual({ guests: 10, gallery: 6 }));
  it('unlimits basic guests', () => expect(limitsFor('basic', settings)).toEqual({ guests: null, gallery: 50 }));
  it('unlimits premium guests', () => expect(limitsFor('premium', settings)).toEqual({ guests: null, gallery: 50 }));
  it('expires after the event date', () => expect(expiresAt({ plan: 'free', eventDate: new Date('2026-01-01') }, settings).toISOString()).toBe('2026-01-31T00:00:00.000Z'));
  it('expires after 365 days without an event date', () => expect(expiresAt({ plan: 'free', createdAt: new Date('2026-01-01') }, settings).toISOString()).toBe('2027-01-01T00:00:00.000Z'));
  it('never expires premium', () => expect(expiresAt({ plan: 'premium', eventDate: new Date('2020-01-01') }, settings)).toBeNull());
  it('detects expiry', () => expect(isExpired({ plan: 'free', eventDate: new Date('2026-01-01') }, settings, new Date('2026-02-01'))).toBe(true));
  it('keeps premium active', () => expect(isExpired({ plan: 'premium', eventDate: new Date('2020-01-01') }, settings, new Date('2026-02-01'))).toBe(false));
  it('prices free to basic', () => expect(upgradeAmount('free', 'basic', settings.prices)).toBe(30000));
  it('prices free to premium', () => expect(upgradeAmount('free', 'premium', settings.prices)).toBe(99000));
  it('prices basic to premium difference', () => expect(upgradeAmount('basic', 'premium', settings.prices)).toBe(69000));
  it('rejects a downgrade', () => expect(upgradeAmount('premium', 'basic', settings.prices)).toBe(0));
});
