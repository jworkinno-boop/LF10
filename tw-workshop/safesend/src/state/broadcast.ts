// Cross-tab sync.
//
// Rules (see NOTES.md): every state carries a monotonic `revision`; every tab
// has a random `tabId`; messages that echo the sender are ignored; the FULL
// state is broadcast, never deltas; a tab adopts only a strictly higher
// revision, otherwise it re-broadcasts its own.

import { CONFIG } from '../config';
import { getOffset, setOffset } from '../clock';
import { referenceCode } from '../ids';
import type { AppState } from '../types';

export const TAB_ID = referenceCode(6);

export type SyncMessage = {
  tabId: string;
  state: AppState;
  clockOffsetMs: number;
};

type Handler = (message: SyncMessage) => void;

export type Broadcaster = {
  post: (state: AppState) => void;
  close: () => void;
};

export function createBroadcaster(onMessage: Handler): Broadcaster {
  let channel: BroadcastChannel | null = null;
  try {
    channel = 'BroadcastChannel' in globalThis ? new BroadcastChannel(CONFIG.broadcastChannel) : null;
  } catch {
    channel = null;
  }

  const handleChannel = (event: MessageEvent<SyncMessage>) => {
    const message = event.data;
    if (!message || message.tabId === TAB_ID) return;
    setOffset(message.clockOffsetMs);
    onMessage(message);
  };

  // `storage` fires only in OTHER tabs, so it is a natural fallback.
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== CONFIG.storageKey || !event.newValue) return;
    try {
      const state = JSON.parse(event.newValue) as AppState;
      onMessage({ tabId: 'storage', state, clockOffsetMs: getOffset() });
    } catch {
      /* ignore unparseable payloads */
    }
  };

  channel?.addEventListener('message', handleChannel as EventListener);
  globalThis.addEventListener?.('storage', handleStorage);

  return {
    post(state) {
      try {
        channel?.postMessage({ tabId: TAB_ID, state, clockOffsetMs: getOffset() } as SyncMessage);
      } catch {
        /* channel closed */
      }
    },
    close() {
      channel?.removeEventListener('message', handleChannel as EventListener);
      globalThis.removeEventListener?.('storage', handleStorage);
      channel?.close();
    },
  };
}
