import { COPY } from '../copy';

/** Non-dismissible, on every screen. */
export function DemoBanner() {
  return (
    <div
      className="sticky top-0 z-40 border-b border-attend-border bg-attend-bg px-4 py-2
                 text-center text-sm font-bold text-ink sm:text-base"
      role="note"
    >
      {COPY.app.demoBanner}
    </div>
  );
}
