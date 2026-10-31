import { LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Avatar } from '../ui/Avatar';

interface Props { q: string; onSearch: (v: string) => void }

export function TopBar({ q, onSearch }: Props) {
  const { user, logout } = useAuth();
  return (
    <header className="flex items-center justify-between gap-4 border-b border-line px-6 py-3">
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
        <input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search by recipient, subject or content"
          aria-label="Search emails"
          className="w-full rounded-md bg-gray-100 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/40"
        />
      </div>
      {user && (
        <div className="flex shrink-0 items-center gap-3">
          <Avatar name={user.name} src={user.avatar} />
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-ink-soft">{user.email}</p>
          </div>
          <button onClick={logout} title="Log out" aria-label="Log out" className="rounded-md p-2 text-ink-soft hover:bg-gray-100">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </header>
  );
}
