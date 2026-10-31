import { Clock, Send } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Counts, SlackStatus } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { SlackCard } from './SlackCard';

interface Props { counts: Counts; slack: SlackStatus | null; onSlackChange: () => void }

const navCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center justify-between rounded-md px-3 py-2 text-sm ${
    isActive ? 'bg-brand-tint font-medium text-brand-dark' : 'text-ink-soft hover:bg-gray-100'
  }`;

export function Sidebar({ counts, slack, onSlackChange }: Props) {
  const { user } = useAuth();
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-5 border-r border-line px-4 py-5">
      <div className="text-xl font-extrabold tracking-tight">ReachInbox</div>

      {user && (
        <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 p-2">
          <Avatar name={user.name} src={user.avatar} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
          </div>
        </div>
      )}

      <Link to="/compose"><Button variant="outline" className="w-full">Compose</Button></Link>

      <nav aria-label="Core" className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-medium text-ink-faint">Core</p>
        <NavLink to="/scheduled" className={navCls}>
          <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Scheduled</span>
          <span className="text-xs">{counts.scheduled}</span>
        </NavLink>
        <NavLink to="/sent" className={navCls}>
          <span className="flex items-center gap-2"><Send className="h-4 w-4" /> Sent</span>
          <span className="text-xs">{counts.sent}</span>
        </NavLink>
      </nav>

      <div className="mt-auto"><SlackCard status={slack} onChange={onSlackChange} /></div>
    </aside>
  );
}
