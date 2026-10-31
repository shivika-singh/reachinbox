import { RotateCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { EmailList } from '../components/email/EmailList';
import { useEmails } from '../hooks/useEmails';
import type { LayoutCtx } from './DashboardLayout';

export default function EmailListPage({ mode }: { mode: 'scheduled' | 'sent' }) {
  const { q, refreshCounts } = useOutletContext<LayoutCtx>();
  const [debounced, setDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const list = useEmails(mode, debounced.trim());

  return (
    <section aria-label={mode === 'scheduled' ? 'Scheduled emails' : 'Sent emails'}>
      <div className="flex items-center justify-between border-b border-line px-6 py-3">
        <h1 className="text-sm font-semibold">
          {mode === 'scheduled' ? 'Scheduled emails' : 'Sent emails'}
          <span className="ml-2 font-normal text-ink-soft">{list.loading ? '' : list.total}</span>
        </h1>
        <button
          onClick={() => { list.reload(); refreshCounts(); }}
          title="Refresh"
          aria-label="Refresh"
          className="rounded-md p-2 text-ink-soft hover:bg-gray-100"
        >
          <RotateCw className="h-4 w-4" />
        </button>
      </div>
      <EmailList
        mode={mode}
        items={list.items}
        total={list.total}
        loading={list.loading}
        loadingMore={list.loadingMore}
        error={list.error}
        searching={debounced.trim().length > 0}
        onRetry={list.reload}
        onLoadMore={list.loadMore}
      />
    </section>
  );
}
