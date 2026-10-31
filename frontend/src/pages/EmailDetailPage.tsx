import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { StatusChip } from '../components/ui/StatusChip';
import { useAuth } from '../context/AuthContext';
import type { Email } from '../types';
import { formatFull } from '../utils/date';

export default function EmailDetailPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [email, setEmail] = useState<Email | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getEmail(id).then(setEmail).catch((e) => setError((e as Error).message));
  }, [id]);

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-line px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => nav(-1)} aria-label="Back" className="rounded-md p-2 hover:bg-gray-100"><ArrowLeft className="h-4 w-4" /></button>
          <h1 className="text-sm font-semibold">{email?.subject ?? 'Email'}</h1>
        </div>
        {user && <Avatar name={user.name} src={user.avatar} />}
      </header>

      {!email && !error && <div className="flex justify-center py-24 text-brand"><Spinner className="h-7 w-7" /></div>}
      {error && <EmptyState icon={<span />} title="Email not found" hint={error} />}

      {email && (
        <article className="mx-auto max-w-3xl px-6 py-6">
          <div className="mb-5 flex items-start gap-3">
            <Avatar name={email.fromEmail} size={36} />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">{email.fromEmail}</p>
              <p className="text-ink-soft">To: {email.toEmail}</p>
            </div>
            <div className="text-right text-xs text-ink-soft">
              <StatusChip status={email.status} />
              <p className="mt-1">{email.sentAt ? `Sent ${formatFull(email.sentAt)}` : `Scheduled ${formatFull(email.scheduledAt)}`}</p>
            </div>
          </div>
          {email.error && <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{email.error}</p>}
          <iframe title="Email body" sandbox="" srcDoc={email.body} className="min-h-[320px] w-full rounded-md border border-line" />
          {email.previewUrl && (
            <a href={email.previewUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              View delivered message on Ethereal <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <p className="mt-6 text-sm"><Link to="/scheduled" className="text-ink-soft hover:underline">Back to dashboard</Link></p>
        </article>
      )}
    </div>
  );
}
