import { CONFIG } from '../config';
import { seedState } from '../data/seed';
import type { AppState } from '../types';

/**
 * Migration stub. There is exactly one schema version today; the shape is here
 * so a v2 can be added without a destructive reseed.
 */
export function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<AppState>;
  if (typeof candidate.schemaVersion !== 'number') return null;

  if (candidate.schemaVersion > CONFIG.schemaVersion) return null;

  // Future versions add their steps here, oldest first.
  const migrated = candidate as AppState;

  if (
    !migrated.accounts ||
    !Array.isArray(migrated.payees) ||
    !Array.isArray(migrated.transfers) ||
    !Array.isArray(migrated.audit) ||
    !migrated.settings
  ) {
    return null;
  }

  const seed = seedState();
  return {
    ...seed,
    ...migrated,
    settings: { ...seed.settings, ...migrated.settings },
    revision: typeof migrated.revision === 'number' ? migrated.revision : 1,
    seq: typeof migrated.seq === 'number' ? migrated.seq : migrated.audit.length,
    lastError: null,
    reseeded: false,
  };
}
