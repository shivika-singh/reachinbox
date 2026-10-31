import type { EmailStatus } from '../../types';

const map: Record<EmailStatus, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-orange-50 text-orange-600' },
  sending: { label: 'Sending', cls: 'bg-blue-50 text-blue-600' },
  sent: { label: 'Sent', cls: 'bg-brand-tint text-brand-dark' },
  failed: { label: 'Failed', cls: 'bg-red-50 text-red-600' },
};

export function StatusChip({ status }: { status: EmailStatus }) {
  const s = map[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>;
}
