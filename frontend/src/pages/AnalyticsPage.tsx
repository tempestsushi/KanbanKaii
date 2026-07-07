import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { AnalyticsMetricCards } from '@/components/analytics/AnalyticsMetricCards';
import { useAnalyticsData } from '@/hooks/analytics/useAnalyticsData';

export function AnalyticsPage() {
  const analytics = useAnalyticsData();

  return (
    <div className="mx-auto max-w-6xl p-5 sm:p-8">
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Workspace analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Live calculations from your private ticket board.</p>
        </div>
        {!analytics.isLoading && (
          <button type="button" onClick={() => void analytics.loadAnalytics()} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm hover:border-violet-300 hover:text-violet-700">
            Refresh
          </button>
        )}
      </div>

      {analytics.isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 shadow-sm">
          Loading your analytics…
        </div>
      )}

      {!analytics.isLoading && analytics.error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p>{analytics.error}</p>
          <button type="button" onClick={() => void analytics.loadAnalytics()} className="mt-3 font-semibold hover:text-rose-900">Try again</button>
        </div>
      )}

      {!analytics.isLoading && !analytics.error && (
        <>
          <AnalyticsMetricCards metrics={analytics.metrics} />
          <AnalyticsCharts
            maximumDailyCount={analytics.maximumDailyCount}
            priorityDistribution={analytics.priorityDistribution}
            ticketCount={analytics.ticketCount}
            weeklyActivity={analytics.weeklyActivity}
          />
        </>
      )}
    </div>
  );
}
