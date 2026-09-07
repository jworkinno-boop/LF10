import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { CONFIG } from '../config';
import { AppStateProvider } from '../state/AppStateProvider';
import { App } from '../App';
import { seedState } from '../data/seed';
import type { AppState } from '../types';

/** Seed localStorage before mounting, so the provider boots from a known state. */
export function seedStorage(mutate: (state: AppState) => AppState = (s) => s): AppState {
  const state = mutate(seedState());
  globalThis.localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  return state;
}

export function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </MemoryRouter>,
  );
}

export function renderWithProviders(ui: ReactElement, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppStateProvider>{ui}</AppStateProvider>
    </MemoryRouter>,
  );
}
