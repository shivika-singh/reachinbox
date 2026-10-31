import { AlertCircle, Clock, Inbox, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Email } from '../../types';
import { formatBadge } from '../../utils/date';
import { stripHtml } from '../../utils/emails';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { StatusChip } from '../ui/StatusChip';

interface Props {
  mode: 'scheduled' | 'sent';
  items: Email[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  searching: boolean;
  onRetry: () => void;
  onLoadMore: () => void;
}

function Row({ email, mode }: { email: Email; mode: Props['mode'] }) {
  const when = mode === 'scheduled' ? email.scheduledAt : email.sentAt;
  return (
    <Link
      to={`/email/${email.id}`}
      className="grid grid-cols-[minmax(0,200px)_130px_90px_minmax(0,1fr)] items-center gap-4 border-b border-line px-6 py-3 text-sm hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none"
    >
      <span className="truncate">
        <span className="text-ink-soft">To: </span>
        <span className="font-medium">{email.toEmail}</span>
      </span>
      <span
        className={`inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
          mode === 'scheduled' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-ink-soft'
        }`}
      >
        {mode === 'scheduled' ? <Clock className="h-3 w-3" /> : <Send className="h-3 w-3" />}
        {formatBadge(when)}
      </span>
      <StatusChip status={email.status} />
      <span className="truncate">
        <span className="font-medium">{email.subject}</span>
        <span className="text-ink-faint"> - {stripHtml(email.body)}</span>
      </span>
    </Link>
  );
}

export function EmailList(p: Props) {
  if (p.loading) {
    return <div className="flex justify-center py-24 text-brand"><Spinner className="h-7 w-7" /></div>;
  }
  if (p.error) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-8 w-8 text-red-400" />}
        title="Couldn't load emails"
        hint={p.error}
      />
    );
  }
  if (p.items.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-9 w-9" />}
        title={p.searching ? 'No emails match your search' : p.mode === 'scheduled' ? 'No scheduled emails' : 'No sent emails yet'}
        hint={
          p.searching
            ? 'Try a different name, address or subject.'
            : p.mode === 'scheduled'
              ? 'Choose Compose to schedule your first campaign.'
              : 'Emails appear here once they have been delivered.'
        }
      />
    );
  }
  return (
    <div>
      {p.items.map((e) => <Row key={e.id} email={e} mode={p.mode} />)}
      {p.items.length < p.total && (
        <div className="flex justify-center py-4">
          <Button variant="outline" loading={p.loadingMore} onClick={p.onLoadMore}>
            Load more ({p.total - p.items.length} remaining)
          </Button>
        </div>
      )}
    </div>
  );
}
