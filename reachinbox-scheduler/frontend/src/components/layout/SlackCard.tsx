import { useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type { SlackStatus } from '../../types';
import { Button } from '../ui/Button';

export function SlackCard({ status, onChange }: { status: SlackStatus | null; onChange: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const connect = () => wrap(async () => {
    const { url } = await api.slackConnectUrl();
    window.location.href = url;
  });
  const test = () => wrap(async () => { await api.slackTest(); toast.success('Test message sent to Slack.'); });
  const disconnect = () => wrap(async () => { await api.slackDisconnect(); toast.success('Slack disconnected.'); onChange(); });

  if (!status) return null;
  return (
    <div className="rounded-lg border border-line p-3 text-sm">
      <p className="font-medium">Slack alerts</p>
      {status.connected ? (
        <>
          <p className="mt-1 text-xs text-ink-soft">
            Connected{status.teamName ? ` to ${status.teamName}` : ''}{status.channel ? ` (${status.channel})` : ''}
          </p>
          <div className="mt-2 flex gap-2">
            <Button variant="outline" className="px-2 py-1 text-xs" loading={busy} onClick={test}>Send test</Button>
            <Button variant="ghost" className="px-2 py-1 text-xs" disabled={busy} onClick={disconnect}>Disconnect</Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-1 text-xs text-ink-soft">Get a Slack message when a sender hits its hourly limit.</p>
          <Button className="mt-2 w-full text-xs" loading={busy} onClick={connect}>Connect Slack</Button>
        </>
      )}
    </div>
  );
}
