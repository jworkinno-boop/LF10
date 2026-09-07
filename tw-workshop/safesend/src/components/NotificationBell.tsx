import { Link } from 'react-router-dom';

export function NotificationBell({ count, to }: { count: number; to: string }) {
  return (
    <Link
      to={to}
      className="relative inline-flex min-h-[52px] min-w-[52px] items-center justify-center
                 rounded-ctl border-2 border-rule-2 bg-surface px-3"
    >
      <span aria-hidden="true" className="text-xl">
        🔔
      </span>
      <span aria-live="polite" className="sr-only">
        {count === 0 ? 'No unread messages' : `${count} unread message${count === 1 ? '' : 's'}`}
      </span>
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-2 -top-2 inline-flex h-7 min-w-[28px] items-center
                     justify-center rounded-full bg-danger px-1 text-sm font-bold text-paper"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}
