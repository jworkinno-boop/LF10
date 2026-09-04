import { COPY } from '../copy';

/** Non-dismissible, on every screen. */
export function DemoBanner() {
  return (
    <div
      className="sticky top-0 z-40 border-b-2 border-yellow-700 bg-yellow-200 px-4 py-2
                 text-center text-sm font-bold text-yellow-950 sm:text-base"
      role="note"
    >
      {COPY.app.demoBanner}
    </div>
  );
}
