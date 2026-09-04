import { useEffect } from 'react';
import { AppShell } from '../../components/Layout';
import { NotificationPreview } from '../../components/NotificationPreview';
import { EmptyState } from '../../components/EmptyState';
import { COPY } from '../../copy';
import { CONFIG } from '../../config';
import { now } from '../../clock';
import { useApp } from '../../state/AppStateProvider';
import { notificationsFor } from '../../state/selectors';

export function Notifications() {
  const { state, dispatch } = useApp();
  const events = notificationsFor(state, 'david');

  useEffect(() => {
    dispatch({ type: 'MARK_NOTIFICATIONS_READ', persona: 'david', nowMs: now() });
  }, [dispatch]);

  // Optional, and never blocking: only used if permission is already granted.
  useEffect(() => {
    if (!CONFIG.featureFlags.browserNotifications) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const latest = events[0];
    if (!latest || latest.readAt) return;
    try {
      new Notification('SafeSend (demo)', { body: latest.channels.pushBody });
    } catch {
      /* the flow never depends on this */
    }
  }, [events]);

  return (
    <AppShell persona="david" title="Messages">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl">Notification inbox</h2>
          <p className="mt-1 text-slate-700">
            This is what each message would look like on the three channels.
          </p>
          <p className="mt-2 rounded-lg border-2 border-blue-800 bg-blue-50 p-3">
            {COPY.approver.smsNoLinkNote}
          </p>
        </div>

        {events.length === 0 ? (
          <EmptyState title={COPY.empty.noNotifications}>
            <p>Messages appear as soon as something needs your attention.</p>
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {events.map((event) => (
              <li key={event.id}>
                <NotificationPreview event={event} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
