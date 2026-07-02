import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTickets } from '@/api/tickets';
import { AppLayout } from '@/components/layout/AppLayout';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/ticket';

const priorityColors: Record<TicketPriority, string> = {
  High: 'bg-rose-400',
  Medium: 'bg-amber-400',
  Low: 'bg-emerald-400',
};

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function AnalyticsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      setTickets(await fetchTickets({ signal }));
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return;
      setError(
        loadError instanceof Error ? loadError.message : 'Could not load analytics',
      );
    } finally {
      if (!signal?.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadAnalytics(controller.signal);
    return () => controller.abort();
  }, [loadAnalytics]);

  const statusCounts = useMemo(() => {
    const counts: Record<TicketStatus, number> = {
      Pending: 0,
      'In Progress': 0,
      Completed: 0,
    };
    tickets.forEach((ticket) => {
      counts[ticket.status] += 1;
    });
    return counts;
  }, [tickets]);

  const completionRate = tickets.length
    ? Math.round((statusCounts.Completed / tickets.length) * 100)
    : 0;

  const metrics = [
    { label: 'Total tickets', value: tickets.length, detail: 'All tickets in your workspace' },
    { label: 'Pending', value: statusCounts.Pending, detail: 'Waiting to be started' },
    { label: 'In progress', value: statusCounts['In Progress'], detail: 'Currently being worked on' },
    { label: 'Completed', value: statusCounts.Completed, detail: `${completionRate}% completion rate` },
  ];

  const weeklyActivity = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - index));
      return {
        date,
        key: localDateKey(date),
        count: 0,
      };
    });

    const dayByKey = new Map(days.map((day) => [day.key, day]));
    tickets.forEach((ticket) => {
      if (!ticket.createdAt) return;
      const createdAt = new Date(ticket.createdAt);
      if (Number.isNaN(createdAt.getTime())) return;
      const day = dayByKey.get(localDateKey(createdAt));
      if (day) day.count += 1;
    });

    return days;
  }, [tickets]);

  const maximumDailyCount = Math.max(
    1,
    ...weeklyActivity.map((day) => day.count),
  );

  const priorityDistribution = useMemo(() => {
    const counts: Record<TicketPriority, number> = {
      High: 0,
      Medium: 0,
      Low: 0,
    };
    tickets.forEach((ticket) => {
      counts[ticket.priority] += 1;
    });

    return (Object.keys(counts) as TicketPriority[]).map((priority) => ({
      priority,
      count: counts[priority],
      percentage: tickets.length
        ? Math.round((counts[priority] / tickets.length) * 100)
        : 0,
    }));
  }, [tickets]);

  return (
    <AppLayout pageTitle="Analytics">
      <div className="mx-auto max-w-6xl p-5 sm:p-8">
        <div className="mb-7 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Workspace analytics</h1>
            <p className="mt-1 text-sm text-slate-500">Live calculations from your private ticket board.</p>
          </div>
          {!isLoading && (
            <button type="button" onClick={() => void loadAnalytics()} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700">
              Refresh
            </button>
          )}
        </div>

        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
            Loading your analytics…
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{error}</p>
            <button type="button" onClick={() => void loadAnalytics()} className="mt-3 font-semibold hover:text-rose-900">Try again</button>
          </div>
        )}

        {!isLoading && !error && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <article key={metric.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-medium text-slate-500">{metric.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-slate-900">{metric.value}</p>
                  <p className="mt-2 text-[11px] text-violet-600">{metric.detail}</p>
                </article>
              ))}
            </section>

            <section className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">Tickets created</h2>
                <p className="mt-1 text-xs text-slate-400">New tickets during the last seven days</p>
                <div className="mt-8 flex h-52 items-end justify-between gap-3 border-b border-slate-100 px-2">
                  {weeklyActivity.map((day) => {
                    const height = day.count
                      ? Math.max(10, (day.count / maximumDailyCount) * 100)
                      : 2;
                    return (
                      <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2" title={`${day.count} ticket${day.count === 1 ? '' : 's'}`}>
                        <span className="text-[10px] font-medium text-slate-500">{day.count}</span>
                        <div className="w-full max-w-10 rounded-t bg-violet-400 transition-all" style={{ height: `${height}%` }} />
                        <span className="text-[10px] text-slate-400">
                          {new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-800">Priority distribution</h2>
                <p className="mt-1 text-xs text-slate-400">All tickets by priority</p>
                <div className="mt-6 space-y-5">
                  {priorityDistribution.map(({ priority, count, percentage }) => (
                    <div key={priority}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-medium text-slate-600">{priority}</span>
                        <span className="text-slate-400">{count} · {percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full transition-all ${priorityColors[priority]}`} style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                {tickets.length === 0 && (
                  <p className="mt-8 text-center text-xs text-slate-400">Create a ticket to begin seeing analytics.</p>
                )}
              </article>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
