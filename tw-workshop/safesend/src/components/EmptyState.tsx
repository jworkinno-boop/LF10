import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-card border-2 border-dashed border-rule bg-surface p-6 text-center">
      <p className="text-lg font-semibold text-ink-2">{title}</p>
      {children ? <div className="mt-2 text-ink-2">{children}</div> : null}
    </div>
  );
}
