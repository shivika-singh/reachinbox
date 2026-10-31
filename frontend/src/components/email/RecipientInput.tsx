import { Upload, X } from 'lucide-react';
import { KeyboardEvent, useRef, useState } from 'react';
import { useToast } from '../../context/ToastContext';
import { extractEmails, isEmail } from '../../utils/emails';

interface Props { value: string[]; onChange: (v: string[]) => void }
const VISIBLE = 4;

export function RecipientInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');
  const [expanded, setExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const merge = (incoming: string[]) => {
    const set = new Set(value);
    incoming.forEach((e) => set.add(e.toLowerCase()));
    onChange([...set]);
  };

  const commit = () => {
    const parts = draft.split(/[\s,;]+/).filter(Boolean);
    if (!parts.length) return;
    const valid = parts.filter(isEmail);
    if (valid.length !== parts.length) toast.error('Some entries are not valid email addresses and were skipped.');
    merge(valid);
    setDraft('');
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (['Enter', ',', ' ', ';'].includes(e.key) && draft.trim()) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const found = extractEmails(await file.text());
      if (!found.length) return toast.error('No email addresses were found in that file.');
      const before = new Set(value).size;
      merge(found);
      toast.success(`${found.length} email address${found.length === 1 ? '' : 'es'} detected in ${file.name}` +
        (before ? ` (added to your ${before} existing)` : ''));
    } catch {
      toast.error('Could not read that file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const shown = expanded ? value : value.slice(0, VISIBLE);

  return (
    <div className="flex items-start gap-3">
      <div className="flex min-h-[32px] flex-1 flex-wrap items-center gap-1.5">
        {shown.map((e) => (
          <span key={e} className="inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-0.5 text-xs text-brand-dark">
            {e}
            <button type="button" aria-label={`Remove ${e}`} onClick={() => onChange(value.filter((x) => x !== e))}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {!expanded && value.length > VISIBLE && (
          <button type="button" onClick={() => setExpanded(true)} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-brand-dark">
            +{value.length - VISIBLE}
          </button>
        )}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text');
            const found = extractEmails(text);
            if (found.length > 1) { e.preventDefault(); merge(found); }
          }}
          placeholder={value.length ? '' : 'recipient@example.com'}
          aria-label="Recipients"
          className="min-w-[160px] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-ink-faint"
        />
      </div>
      <div className="flex shrink-0 items-center gap-3 text-xs">
        {value.length > 0 && <span className="text-ink-soft">{value.length} detected</span>}
        <input ref={fileRef} type="file" accept=".csv,.txt,text/csv,text/plain" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 font-medium text-brand hover:underline">
          <Upload className="h-3.5 w-3.5" /> Upload List
        </button>
      </div>
    </div>
  );
}
