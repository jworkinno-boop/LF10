// All demo data, seeded relative to the frozen DEMO_NOW so "12 days ago" is
// stable across sessions and screenshots.

import { CONFIG } from '../config';
import { DAY_MS, iso, parse } from '../clock';
import { DEMO_NOW } from '../clock';
import type {
  Account,
  AppState,
  HistoryTxn,
  Payee,
  Persona,
  TrustedContact,
} from '../types';

const BASE = parse(DEMO_NOW);

/** Days before the frozen demo epoch, as an ISO string. */
export function daysBeforeSeed(days: number, hour = 10): string {
  return iso(BASE - days * DAY_MS + (hour - 10) * 3_600_000);
}

export const ACCOUNTS: Record<Persona, Account> = {
  margaret: {
    id: 'acc_margaret',
    ownerName: 'Margaret Whitfield',
    age: 78,
    role: 'sender',
    iban: 'NL00DEMO00123456',
    balanceCents: 1_482_055,
    currency: 'EUR',
    countryCode: 'NL',
    phone: '+31 6 0000 0000',
    email: 'margaret@example.com',
  },
  david: {
    id: 'acc_david',
    ownerName: 'David Whitfield',
    age: 49,
    role: 'approver',
    currency: 'EUR',
    countryCode: 'NL',
    phone: '+31 6 0000 0000',
    email: 'david@example.com',
  },
};

export const DEMO_PINS: Record<Persona, string> = {
  margaret: '1978',
  david: '4901',
};

export function seedContacts(): TrustedContact[] {
  return [
    {
      id: 'contact_david',
      persona: 'david',
      name: 'David Whitfield',
      age: 49,
      relationship: 'Son',
      phone: '+31 6 0000 0000',
      email: 'david@example.com',
      active: true,
      since: daysBeforeSeed(400),
    },
    {
      id: 'contact_jean',
      persona: null,
      name: 'Jean Okafor',
      age: 71,
      relationship: 'Neighbour',
      phone: '+31 6 0000 0000',
      email: 'jean@example.com',
      active: false,
      since: daysBeforeSeed(400),
    },
  ];
}

export function seedPayees(): Payee[] {
  return [
    {
      id: 'payee_energy',
      displayName: 'Northgate Energy',
      iban: 'NL00DEMO99001122',
      countryCode: 'NL',
      status: 'trusted',
      isSaved: true,
      addedAt: daysBeforeSeed(1400),
      lastPaidAt: daysBeforeSeed(12),
      timesPaid: 6,
      copResult: 'match',
      copNameOnAccount: 'Northgate Energy',
    },
    {
      id: 'payee_david',
      displayName: 'David Whitfield',
      iban: 'NL00DEMO00887711',
      countryCode: 'NL',
      status: 'trusted',
      isSaved: true,
      addedAt: daysBeforeSeed(1800),
      lastPaidAt: daysBeforeSeed(90),
      timesPaid: 4,
      copResult: 'match',
      copNameOnAccount: 'David Whitfield',
    },
    {
      id: 'payee_pharmacy',
      displayName: "Clara's Pharmacy",
      iban: 'NL00DEMO44556677',
      countryCode: 'NL',
      status: 'trusted',
      isSaved: true,
      addedAt: daysBeforeSeed(1100),
      lastPaidAt: daysBeforeSeed(22),
      timesPaid: 5,
      copResult: 'match',
      copNameOnAccount: "Clara's Pharmacy",
    },
    {
      id: 'payee_garden',
      displayName: 'Rosewood Garden Care',
      iban: 'NL00DEMO33221100',
      countryCode: 'NL',
      status: 'known',
      isSaved: true,
      addedAt: daysBeforeSeed(240),
      lastPaidAt: daysBeforeSeed(60),
      timesPaid: 2,
      copResult: 'match',
      copNameOnAccount: 'Rosewood Garden Care',
    },
    {
      // In the 90-day history but not in the address book.
      id: 'payee_insurance',
      displayName: 'Meadowlark Insurance (demo)',
      iban: 'NL00DEMO77445566',
      countryCode: 'NL',
      status: 'known',
      isSaved: false,
      addedAt: daysBeforeSeed(800),
      lastPaidAt: daysBeforeSeed(45),
      timesPaid: 1,
      copResult: 'match',
      copNameOnAccount: 'Meadowlark Insurance (demo)',
    },
  ];
}

/**
 * Nine outgoing payments over 90 days.
 * Range €18.40 – €340.00, median €85.00, largest €340.00 (annual insurance).
 */
export function seedHistory(): HistoryTxn[] {
  const rows: Array<[number, string, string, number, string]> = [
    [12, 'payee_energy', 'Northgate Energy', 6240, 'Monthly electricity bill'],
    [22, 'payee_pharmacy', "Clara's Pharmacy", 9620, 'Prescription and vitamins'],
    [30, 'payee_energy', 'Northgate Energy', 7850, 'Monthly electricity bill'],
    [45, 'payee_insurance', 'Meadowlark Insurance (demo)', 34000, 'Annual home insurance renewal'],
    [52, 'payee_pharmacy', "Clara's Pharmacy", 1840, 'Cough medicine'],
    [60, 'payee_garden', 'Rosewood Garden Care', 21000, 'Hedge cutting and clearance'],
    [68, 'payee_energy', 'Northgate Energy', 8500, 'Monthly electricity bill'],
    [80, 'payee_garden', 'Rosewood Garden Care', 12000, 'Lawn and borders'],
    [90, 'payee_david', 'David Whitfield', 4200, 'Birthday money for the children'],
  ];
  return rows.map(([days, payeeId, payeeName, amountCents, description], i) => ({
    id: `hist_${i + 1}`,
    payeeId,
    payeeName,
    amountCents,
    at: daysBeforeSeed(days, 11),
    description,
  }));
}

export function seedState(): AppState {
  return {
    schemaVersion: CONFIG.schemaVersion,
    revision: 1,
    activePersona: null,
    unlocked: [],
    accounts: ACCOUNTS,
    contacts: seedContacts(),
    payees: seedPayees(),
    history: seedHistory(),
    transfers: [],
    notifications: [],
    audit: [],
    settings: { ...CONFIG.defaults },
    pendingChanges: [],
    draft: null,
    agreementMadeAt: daysBeforeSeed(400),
    seq: 0,
    lastError: null,
    reseeded: false,
  };
}
