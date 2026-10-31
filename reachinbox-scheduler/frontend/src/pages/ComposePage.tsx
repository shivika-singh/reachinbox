import { ArrowLeft, Clock, X } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { RecipientInput } from '../components/email/RecipientInput';
import { RichTextEditor } from '../components/email/RichTextEditor';
import { SendLaterPopover } from '../components/email/SendLaterPopover';
import { Button } from '../components/ui/Button';
import { useToast } from '../context/ToastContext';
import type { Meta } from '../types';
import { formatFull } from '../utils/date';

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex items-start gap-4 border-b border-line py-3 text-sm">
    <span className="w-14 shrink-0 pt-1 text-ink-soft">{label}</span>
    <div className="min-w-0 flex-1">{children}</div>
  </div>
);

const numCls = 'w-16 rounded-md bg-gray-100 px-2 py-1 text-center text-sm outline-none focus:ring-2 focus:ring-brand/40';

export default function ComposePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [senderId, setSenderId] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [text, setText] = useState('');
  const [delay, setDelay] = useState('');
  const [hourly, setHourly] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [showLater, setShowLater] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.meta().then(setMeta).catch((e) => toast.error((e as Error).message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (!recipients.length) return toast.error('Add at least one recipient or upload a list.');
    if (!subject.trim()) return toast.error('Enter a subject.');
    if (!text.trim()) return toast.error('Write the email body.');
    const delaySeconds = delay === '' ? 0 : Number(delay);
    if (!Number.isFinite(delaySeconds) || delaySeconds < 0) return toast.error('Delay must be 0 or more seconds.');
    const max = meta?.limits.maxEmailsPerHour;
    const hourlyLimit = hourly === '' ? undefined : Number(hourly);
    if (hourlyLimit !== undefined && (!Number.isInteger(hourlyLimit) || hourlyLimit < 1)) {
      return toast.error('Hourly limit must be a whole number of 1 or more.');
    }
    if (hourlyLimit !== undefined && max && hourlyLimit > max) {
      return toast.error(`Hourly limit can't exceed the server maximum of ${max}.`);
    }

    setSubmitting(true);
    try {
      const r = await api.schedule({
        subject: subject.trim(),
        body: html,
        recipients,
        startTime: startTime?.toISOString(),
        delaySeconds,
        hourlyLimit,
        senderId: senderId || null,
      });
      toast.success(`${r.count} email${r.count === 1 ? '' : 's'} scheduled.`);
      nav('/scheduled');
    } catch (e) {
      toast.error((e as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="relative flex items-center justify-between border-b border-line px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} aria-label="Back" className="rounded-md p-2 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-sm font-semibold">Compose New Email</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLater((v) => !v)}
            title="Send later"
            aria-label="Send later"
            aria-expanded={showLater}
            className={`rounded-md p-2 hover:bg-gray-100 ${startTime ? 'text-brand' : 'text-ink-soft'}`}
          >
            <Clock className="h-4 w-4" />
          </button>
          <Button variant="outline" loading={submitting} onClick={submit}>{startTime ? 'Schedule' : 'Send'}</Button>
        </div>
        {showLater && (
          <SendLaterPopover
            value={startTime}
            onCancel={() => setShowLater(false)}
            onDone={(d) => { setStartTime(d); setShowLater(false); }}
          />
        )}
      </header>

      <div className="mx-auto max-w-4xl px-6 py-2">
        <Field label="From">
          <select
            value={senderId}
            onChange={(e) => setSenderId(e.target.value)}
            aria-label="From"
            className="rounded-full bg-gray-100 px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-brand/40"
          >
            <option value="">Rotate across all senders</option>
            {meta?.senders.map((s) => <option key={s.id} value={s.id}>{s.email}</option>)}
          </select>
        </Field>
        <Field label="To"><RecipientInput value={recipients} onChange={setRecipients} /></Field>
        <Field label="Subject">
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject"
            className="w-full bg-transparent py-1 outline-none placeholder:text-ink-faint" />
        </Field>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 border-b border-line py-3 text-sm">
          <label className="flex items-center gap-2 text-ink-soft">
            Delay between 2 emails
            <input type="number" min={0} value={delay} onChange={(e) => setDelay(e.target.value)} placeholder="0" className={numCls} />
            <span className="text-xs">sec</span>
          </label>
          <label className="flex items-center gap-2 text-ink-soft">
            Hourly Limit
            <input type="number" min={1} max={meta?.limits.maxEmailsPerHour} value={hourly} onChange={(e) => setHourly(e.target.value)}
              placeholder={meta ? String(meta.limits.maxEmailsPerHour) : '0'} className={numCls} />
          </label>
          {startTime && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs text-orange-600">
              Starts {formatFull(startTime.toISOString())}
              <button type="button" aria-label="Clear start time" onClick={() => setStartTime(null)}><X className="h-3 w-3" /></button>
            </span>
          )}
        </div>

        <div className="py-4"><RichTextEditor onChange={(h, t) => { setHtml(h); setText(t); }} /></div>
      </div>
    </div>
  );
}
