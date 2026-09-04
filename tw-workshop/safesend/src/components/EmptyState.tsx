import type { ReactNode } from 'react';

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white p-6 text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      {children ? <div className="mt-2 text-slate-700">{children}</div> : null}
    </div>
  );
}
