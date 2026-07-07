import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchTickets } from '@/api/tickets';
import type { Ticket, TicketPriority, TicketStatus } from '@/types/ticket';

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function useAnalyticsData() {
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

  return {
    error,
    isLoading,
    loadAnalytics,
    maximumDailyCount,
    metrics,
    priorityDistribution,
    ticketCount: tickets.length,
    weeklyActivity,
  };
}
