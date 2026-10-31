import { ReactNode } from 'react';

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <div className="text-ink-faint">{icon}</div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {hint && <p className="max-w-xs text-sm text-ink-soft">{hint}</p>}
    </div>
  );
}
