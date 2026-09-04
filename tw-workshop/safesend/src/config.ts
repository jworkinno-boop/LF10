// Single place for locale, currency, thresholds and feature flags.

export const CONFIG = {
  locale: 'en-GB',
  currency: 'EUR' as const,
  timeZone: 'Europe/Amsterdam',
  bankName: 'Northgate Bank (demo)',
  appDomain: 'safesend.example',
  storageKey: 'safesend.state.v1',
  schemaVersion: 1 as const,
  broadcastChannel: 'safesend',
  engineVersion: '2.0.0',

  defaults: {
    approvalThresholdCents: 50_000,
    dailyLimitCents: 100_000,
    alwaysApproveNewPayees: true,
    alwaysApproveCrossBorder: true,
    blockCriticalOutright: false,
    secondContactActive: false,
  },

  thresholdRange: { minCents: 10_000, maxCents: 250_000, stepCents: 5_000 },
  dailyLimitRange: { minCents: 20_000, maxCents: 500_000, stepCents: 10_000 },

  /** Hours an approval request stays open before it expires. */
  approvalExpiryHours: 24,
  /** Hours of delay before a protection-weakening change takes effect. */
  settingsDelayHours: 24,
  /** Cooling-off hold applied after approval of a CRITICAL transfer. */
  coolingOffMinutes: 30 as const,
  /** Minimum characters of free-text reason. */
  minReasonChars: 10,
  /** "Other" needs this much detail before R08 stops firing. */
  vagueReasonChars: 15,
  /** Window in which a rejection makes a resubmission suspicious (R19). */
  rejectionWindowHours: 72,
  /** How long after a CRITICAL rejection the approver is nudged to phone. */
  escalationNudgeMinutes: 10,
  /** Lookback for "your usual payments". */
  patternWindowDays: 90,

  riskBands: {
    LOW: { min: 0, max: 24 },
    MEDIUM: { min: 25, max: 49 },
    HIGH: { min: 50, max: 74 },
    CRITICAL: { min: 75, max: 100 },
  },

  /** Calibration guards — see NOTES.md "Risk engine calibration". */
  caps: {
    tierAKeywords: 40,
    tierBKeywords: 25,
    keywordsCombined: 55,
    /** Circumstantial evidence alone can never push a transfer past MEDIUM. */
    circumstantial: 45,
    /** Mitigators can soften a score, never erase it. */
    mitigation: 25,
  },

  featureFlags: {
    browserNotifications: true,
    crossTabSync: true,
  },
} as const;

export type Config = typeof CONFIG;
