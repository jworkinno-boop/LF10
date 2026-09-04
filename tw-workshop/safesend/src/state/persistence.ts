import { CONFIG } from '../config';
import { seedState } from '../data/seed';
import { migrate } from './migrations';
import type { AppState } from '../types';

export function loadState(): { state: AppState; reseeded: boolean } {
  try {
    const raw = globalThis.localStorage?.getItem(CONFIG.storageKey);
    if (!raw) return { state: seedState(), reseeded: false };
    const migrated = migrate(JSON.parse(raw));
    if (!migrated) return { state: { ...seedState(), reseeded: true }, reseeded: true };
    return { state: migrated, reseeded: false };
  } catch {
    // Corrupt or unreadable storage: reseed, and say so calmly in the UI.
    return { state: { ...seedState(), reseeded: true }, reseeded: true };
  }
}

export function saveState(state: AppState): void {
  try {
    globalThis.localStorage?.setItem(CONFIG.storageKey, JSON.stringify(state));
  } catch {
    /* private mode or quota — the demo keeps working in memory */
  }
}

export function clearState(): void {
  try {
    globalThis.localStorage?.removeItem(CONFIG.storageKey);
  } catch {
    /* ignore */
  }
}
