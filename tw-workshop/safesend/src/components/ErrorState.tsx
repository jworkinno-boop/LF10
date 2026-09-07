import type { ReactNode } from 'react';

export function ErrorState({
  title,
  children,
  onDismiss,
}: {
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
}) {
  return (
    <div
      role="alert"
      className="card-danger p-4"
    >
      <p className="font-bold">{title}</p>
      {children ? <div className="mt-1">{children}</div> : null}
      {onDismiss ? (
        <button type="button" className="link mt-2" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
