// The ten category chips are gone from the wizard (handoff §5.4): they made
// Margaret map her intent onto a taxonomy before she was allowed to narrate,
// and the free text is what the risk engine and David actually read.
//
// `reasonCategory` still exists downstream — R08 keys off "other" plus a short
// reason, and David's screen shows it — so it is derived from her own words
// here and flagged as derived (`Transfer.reasonCategoryDerived`). It is never
// kept as a silent hidden field, and the derivation only ever *narrows* to a
// named category: anything it cannot place stays "other", which is the
// conservative direction, since "other" is what R08 looks for.

import type { ReasonCategory } from '../types';

// First match wins, so the more specific categories come first.
const PATTERNS: Array<[ReasonCategory, RegExp]> = [
  ['medical', /\b(prescription|pharmac|chemist|medicine|medication|doctor|dentist|hospital|optician|physio)\w*/i],
  ['rent_care', /\b(rent|care home|carer|care fees|nursing|landlord|household help)\w*/i],
  ['repairs', /\b(repair|plumber|electrician|builder|boiler|roof|fence|garden|decorat|handyman|tradesman|tradesperson|mechanic|garage)\w*/i],
  ['bill', /\b(bill|electric|gas|water|energy|council tax|broadband|internet|phone bill|insurance|premium|subscription|licence)\w*/i],
  ['fees_tax', /\b(tax|customs|duty|fine|court fee|admin fee|release fee|clearance)\w*/i],
  ['investment', /\b(invest|savings|shares|bond|crypto|bitcoin|portfolio|trading)\w*/i],
  ['family', /\b(birthday|christmas|present|gift|grandson|granddaughter|grandchild|daughter|son|niece|nephew|wedding|anniversary)\w*/i],
  ['shopping', /\b(bought|buying|purchase|order|deposit|holiday|cottage|furniture|sofa|car|ticket)\w*/i],
  ['helping', /\b(help(ing)? (out|him|her|them)|lend|loan|borrow|stuck|emergency)\w*/i],
];

/** Never throws and never guesses beyond the list: unplaceable words are "other". */
export function deriveReasonCategory(reasonText: string): ReasonCategory {
  const text = reasonText.trim();
  if (!text) return 'other';
  for (const [category, pattern] of PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'other';
}
