const DAY = 86_400_000;

/** "Tue 10:30 AM" within a week, otherwise "Nov 12, 10:30 AM" */
export function formatBadge(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (Math.abs(d.getTime() - Date.now()) < 6 * DAY) {
    return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  }
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

export const formatFull = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : '—';

/** value for <input type="datetime-local"> in local time */
export function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
