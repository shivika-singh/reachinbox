import { useState } from 'react';
import { toLocalInput } from '../../utils/date';
import { Button } from '../ui/Button';

interface Props { value: Date | null; onCancel: () => void; onDone: (d: Date | null) => void }

function quickOptions() {
  const at = (days: number, h: number, m = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d;
  };
  return [
    { label: 'In 2 minutes', date: new Date(Date.now() + 2 * 60_000) },
    { label: 'Tomorrow, 10:00 AM', date: at(1, 10) },
    { label: 'Tomorrow, 11:00 AM', date: at(1, 11) },
    { label: 'Tomorrow, 3:00 PM', date: at(1, 15) },
  ];
}

export function SendLaterPopover({ value, onCancel, onDone }: Props) {
  const [local, setLocal] = useState(value ? toLocalInput(value) : '');
  const [error, setError] = useState('');

  const done = () => {
    if (!local) return onDone(null);
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return setError('Pick a valid date and time.');
    onDone(d);
  };

  return (
    <div role="dialog" aria-label="Send later" className="absolute right-0 top-11 z-20 w-72 rounded-lg border border-line bg-white p-4 shadow-xl">
      <p className="mb-3 text-sm font-semibold">Send Later</p>
      <input
        type="datetime-local"
        value={local}
        min={toLocalInput(new Date())}
        onChange={(e) => { setLocal(e.target.value); setError(''); }}
        className="mb-3 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-brand focus:outline-none"
      />
      <ul className="mb-3 space-y-0.5">
        {quickOptions().map((o) => (
          <li key={o.label}>
            <button type="button" onClick={() => setLocal(toLocalInput(o.date))} className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100">
              {o.label}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="button" onClick={done}>Done</Button>
      </div>
    </div>
  );
}
