import { Bell, UserRound } from 'lucide-react';
import { useState, type SyntheticEvent } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { fetchTickets } from '@/api/tickets';
import type { Ticket } from '@/types/ticket';

interface TopNavProps {
  pageTitle: string;
}

export function TopNav({ pageTitle }: TopNavProps) {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const displayName =
    (user?.user_metadata.display_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Account';

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      window.location.replace('/auth');
    } finally {
      setIsSigningOut(false);
    }
  };

  const loadNotifications = async () => {
    if (notificationsLoading) return;
    setNotificationsLoading(true);
    setNotificationsError(null);
    try {
      const tickets = await fetchTickets();
      setNotifications(tickets.slice(0, 5));
    } catch (error) {
      setNotificationsError(
        error instanceof Error ? error.message : 'Could not load notifications',
      );
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleNotificationToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open) void loadNotifications();
  };

  const notificationTime = (createdAt?: string) => {
    if (!createdAt) return 'Recently';
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(createdAt));
  };

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-violet-600">{pageTitle}</p>
        <p className="hidden text-[11px] text-slate-400 sm:block">AI Ticket Manager</p>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <details className="group relative" onToggle={handleNotificationToggle}>
          <summary className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-violet-600 [&::-webkit-details-marker]:hidden">
            <Bell className="h-[17px] w-[17px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            <span className="sr-only">Notifications</span>
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <p className="text-[11px] text-slate-400">Recently created tickets</p>
            </div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
              {notificationsLoading && (
                <p className="px-4 py-5 text-center text-xs text-slate-400">Loading tickets…</p>
              )}
              {!notificationsLoading && notificationsError && (
                <div className="px-4 py-4">
                  <p className="text-xs text-rose-600">{notificationsError}</p>
                  <button type="button" onClick={() => void loadNotifications()} className="mt-2 text-xs font-semibold text-violet-600 hover:text-violet-800">Try again</button>
                </div>
              )}
              {!notificationsLoading && !notificationsError && notifications.length === 0 && (
                <p className="px-4 py-5 text-center text-xs text-slate-400">No tickets have been created yet.</p>
              )}
              {!notificationsLoading && !notificationsError && notifications.map((ticket) => (
                <a key={ticket.id} href="/dashboard" className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-2 text-xs font-medium leading-4 text-slate-700">{ticket.title}</p>
                    <span className="shrink-0 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-600">{ticket.source}</span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-400">Created {notificationTime(ticket.createdAt)}</p>
                </a>
              ))}
            </div>
          </div>
        </details>

        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-slate-100 [&::-webkit-details-marker]:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="hidden max-w-28 truncate text-xs font-medium text-slate-600 sm:inline">{displayName}</span>
          </summary>
          <div className="absolute right-0 z-40 mt-2 w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2.5">
              <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{user?.email}</p>
            </div>
            <a href="/profile" className="mt-1 block rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700">
              Profile
            </a>
            <a href="/settings" className="block rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700">
              Settings
            </a>
            <button
              type="button"
              disabled={isSigningOut}
              onClick={() => void handleSignOut()}
              className="block w-full rounded-md px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
