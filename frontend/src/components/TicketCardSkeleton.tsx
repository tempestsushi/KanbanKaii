import { Skeleton } from '@/components/ui/skeleton';

export function TicketCardSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-3.5 w-3/4" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-2.5 w-full" />
        <Skeleton className="h-2.5 w-5/6" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3">
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}
