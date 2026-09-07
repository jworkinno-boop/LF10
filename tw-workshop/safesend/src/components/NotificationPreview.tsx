import { COPY } from '../copy';
import { formatDateTime } from '../format';
import type { NotificationEvent } from '../types';

/** Renders what an SMS, email and push notification WOULD look like. */
export function NotificationPreview({ event }: { event: NotificationEvent }) {
  return (
    <article className="card">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{event.channels.emailSubject}</h3>
        <p className="text-sm text-ink-2">{formatDateTime(event.createdAt)}</p>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <section aria-label="Text message preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
            Text message
          </p>
          <div className="rounded-2xl rounded-bl-none border border-rule bg-paper p-3 text-sm">
            {event.channels.smsPreview}
          </div>
          <p className="mt-2 text-xs text-ink-2">{COPY.approver.smsNoLinkNote}</p>
        </section>

        <section aria-label="Email preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">Email</p>
          <div className="rounded-ctl border border-rule bg-surface p-3 text-sm">
            <p className="font-semibold">{event.channels.emailSubject}</p>
            <p className="mt-2 whitespace-pre-line">{event.channels.emailBody}</p>
          </div>
        </section>

        <section aria-label="Push notification preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-3">
            Push notification
          </p>
          <div className="rounded-card border border-rule bg-ink p-3 text-sm text-paper">
            <p className="font-semibold">{COPY.app.name}</p>
            <p>{event.channels.pushBody}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
