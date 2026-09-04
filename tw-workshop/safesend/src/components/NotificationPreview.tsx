import { COPY } from '../copy';
import { formatDateTime } from '../format';
import type { NotificationEvent } from '../types';

/** Renders what an SMS, email and push notification WOULD look like. */
export function NotificationPreview({ event }: { event: NotificationEvent }) {
  return (
    <article className="card">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">{event.channels.emailSubject}</h3>
        <p className="text-sm text-slate-700">{formatDateTime(event.createdAt)}</p>
      </header>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <section aria-label="Text message preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            Text message
          </p>
          <div className="rounded-2xl rounded-bl-none border border-slate-300 bg-slate-100 p-3 text-sm">
            {event.channels.smsPreview}
          </div>
          <p className="mt-2 text-xs text-slate-700">{COPY.approver.smsNoLinkNote}</p>
        </section>

        <section aria-label="Email preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">Email</p>
          <div className="rounded-lg border border-slate-300 bg-white p-3 text-sm">
            <p className="font-semibold">{event.channels.emailSubject}</p>
            <p className="mt-2 whitespace-pre-line">{event.channels.emailBody}</p>
          </div>
        </section>

        <section aria-label="Push notification preview">
          <p className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            Push notification
          </p>
          <div className="rounded-xl border border-slate-300 bg-slate-900 p-3 text-sm text-white">
            <p className="font-semibold">SafeSend</p>
            <p>{event.channels.pushBody}</p>
          </div>
        </section>
      </div>
    </article>
  );
}
