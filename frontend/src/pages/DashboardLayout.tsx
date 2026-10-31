import { useCallback, useEffect, useState } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { Sidebar } from '../components/layout/Sidebar';
import { TopBar } from '../components/layout/TopBar';
import { useToast } from '../context/ToastContext';
import type { Counts, SlackStatus } from '../types';

export interface LayoutCtx { q: string; refreshCounts: () => void }

export default function DashboardLayout() {
  const [params, setParams] = useSearchParams();
  const toast = useToast();
  const [counts, setCounts] = useState<Counts>({ scheduled: 0, sent: 0 });
  const [slack, setSlack] = useState<SlackStatus | null>(null);

  const refreshCounts = useCallback(() => { api.counts().then(setCounts).catch(() => undefined); }, []);
  const refreshSlack = useCallback(() => { api.slackStatus().then(setSlack).catch(() => setSlack({ connected: false })); }, []);

  useEffect(() => {
    refreshCounts();
    refreshSlack();
    const t = setInterval(refreshCounts, 10_000);
    return () => clearInterval(t);
  }, [refreshCounts, refreshSlack]);

  // Handle the redirect back from Slack OAuth (?slack=connected|error)
  useEffect(() => {
    const s = params.get('slack');
    if (!s) return;
    if (s === 'connected') toast.success('Slack connected. Rate-limit alerts will now be sent there.');
    else toast.error('Slack connection failed. Please try again.');
    refreshSlack();
    const next = new URLSearchParams(params);
    next.delete('slack');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = params.get('q') ?? '';
  const onSearch = (v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set('q', v); else next.delete('q');
    setParams(next, { replace: true });
  };

  return (
    <div className="flex h-screen">
      <Sidebar counts={counts} slack={slack} onSlackChange={refreshSlack} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar q={q} onSearch={onSearch} />
        <main className="flex-1 overflow-y-auto">
          <Outlet context={{ q, refreshCounts } satisfies LayoutCtx} />
        </main>
      </div>
    </div>
  );
}
