import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react';
import { now } from '../clock';
import { CONFIG } from '../config';
import { COPY } from '../copy';
import { materialiseTime, reducer, type Action } from './reducer';
import { loadState, saveState } from './persistence';
import { createBroadcaster, TAB_ID, type Broadcaster } from './broadcast';
import type { AppState, Persona } from '../types';

type ContextValue = {
  state: AppState;
  dispatch: (action: Action) => void;
  persona: Persona | null;
  nowMs: () => number;
};

const AppStateContext = createContext<ContextValue | null>(null);

/**
 * Time-driven transitions are materialised before every dispatched action, so
 * the reducer itself stays a pure function of (state, action).
 */
function rootReducer(state: AppState, action: Action): AppState {
  if (action.type === 'ADOPT') {
    return materialiseTime(action.state, now());
  }
  const materialised = materialiseTime(state, now());
  return reducer(materialised, action);
}

function bootstrap(): AppState {
  const loaded = loadState();
  return loaded.reseeded
    ? { ...loaded.state, lastError: COPY.errors.corruptState }
    : loaded.state;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(rootReducer, undefined, bootstrap);
  const broadcaster = useRef<Broadcaster | null>(null);
  const lastBroadcast = useRef<number>(-1);
  const stateRef = useRef(state);
  stateRef.current = state;

  const dispatch = useCallback((action: Action) => rawDispatch(action), []);

  // --- cross-tab sync ---
  useEffect(() => {
    if (!CONFIG.featureFlags.crossTabSync) return;
    broadcaster.current = createBroadcaster((message) => {
      const local = stateRef.current;
      if (message.state.revision > local.revision) {
        rawDispatch({ type: 'ADOPT', state: message.state });
      } else if (message.state.revision < local.revision) {
        // Our copy is newer — tell the other tab about it.
        broadcaster.current?.post(local);
      }
    });
    return () => {
      broadcaster.current?.close();
      broadcaster.current = null;
    };
  }, []);

  // --- persist, then broadcast, so the storage fallback carries the revision ---
  useEffect(() => {
    if (state.revision === lastBroadcast.current) return;
    lastBroadcast.current = state.revision;
    saveState(state);
    broadcaster.current?.post(state);
  }, [state]);

  // --- lazy materialisation on focus and visibility ---
  useEffect(() => {
    const materialise = () => rawDispatch({ type: 'MATERIALISE', nowMs: now() });
    globalThis.addEventListener?.('focus', materialise);
    globalThis.document?.addEventListener?.('visibilitychange', materialise);
    materialise();
    return () => {
      globalThis.removeEventListener?.('focus', materialise);
      globalThis.document?.removeEventListener?.('visibilitychange', materialise);
    };
  }, []);

  // --- a ticking interval ONLY while something is actually pending ---
  const hasTimedWork =
    state.transfers.some((t) => t.state === 'APPROVED_HOLD' || t.state === 'PENDING_APPROVAL') ||
    state.pendingChanges.length > 0;

  useEffect(() => {
    if (!hasTimedWork) return;
    const timer = setInterval(() => rawDispatch({ type: 'MATERIALISE', nowMs: now() }), 15_000);
    return () => clearInterval(timer);
  }, [hasTimedWork]);

  const value = useMemo<ContextValue>(
    () => ({ state, dispatch, persona: state.activePersona, nowMs: now }),
    [state, dispatch],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useApp(): ContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}

export { TAB_ID };
