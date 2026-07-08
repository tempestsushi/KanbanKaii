import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';
import { AppLayout } from '@/components/layout/AppLayout';
import { TicketCardSkeleton } from '@/components/TicketCardSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { appNavigateEvent } from '@/lib/navigation';

const loadAuthPage = () => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage }));
const loadResetPasswordPage = () => import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage }));
const loadDashboardPage = () => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage }));
const loadAnalyticsPage = () => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage }));
const loadProfilePage = () => import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage }));
const loadSettingsPage = () => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage }));
const loadOrganizationPage = () => import('@/pages/OrganizationPage').then((module) => ({ default: module.OrganizationPage }));
const loadOrganizationBoardPage = () => import('@/pages/OrganizationBoardPage').then((module) => ({ default: module.OrganizationBoardPage }));
const loadJoinOrganizationPage = () => import('@/pages/JoinOrganizationPage').then((module) => ({ default: module.JoinOrganizationPage }));

const AuthPage = lazy(loadAuthPage);
const ResetPasswordPage = lazy(loadResetPasswordPage);
const DashboardPage = lazy(loadDashboardPage);
const AnalyticsPage = lazy(loadAnalyticsPage);
const ProfilePage = lazy(loadProfilePage);
const SettingsPage = lazy(loadSettingsPage);
const OrganizationPage = lazy(loadOrganizationPage);
const OrganizationBoardPage = lazy(loadOrganizationBoardPage);
const JoinOrganizationPage = lazy(loadJoinOrganizationPage);

function PageLoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-violet-50 px-4">
      <div className="flex items-center gap-3 rounded-full border border-violet-100 bg-white px-5 py-3 text-xs font-semibold text-violet-700 shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
        Loading KanbanKaii…
      </div>
    </main>
  );
}

function PageBodyLoading() {
  return (
    <div className="min-h-full bg-slate-50">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5 sm:flex-nowrap sm:px-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="order-3 h-8 w-full sm:order-none sm:w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-9" />
          <Skeleton className="h-8 w-9" />
          <Skeleton className="h-8 w-9" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-h-[calc(100dvh-11rem)] min-w-[780px] grid-cols-3 divide-x divide-slate-200 bg-slate-100/70 sm:min-h-[calc(100dvh-7.5rem)]">
          {['Pending', 'In Progress', 'Completed'].map((column) => (
            <section key={column} className="px-3 py-3 sm:px-4">
              <div className="mb-3 flex h-7 items-center justify-between">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-5" />
              </div>
              <div className="space-y-2.5">
                <TicketCardSkeleton />
                <TicketCardSkeleton />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AuthenticatedApp() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const pageTitle = useMemo(() => {
    if (pathname === '/analytics') return 'Analytics';
    if (pathname === '/profile') return 'Profile';
    if (pathname === '/settings') return 'Settings';
    if (pathname === '/organization') return 'Organization';
    if (pathname === '/organization-board') return 'Organization board';
    return 'Kanban dashboard';
  }, [pathname]);

  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    const handleNavigate = () => syncPath();
    window.addEventListener('popstate', syncPath);
    window.addEventListener(appNavigateEvent, handleNavigate);
    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener(appNavigateEvent, handleNavigate);
    };
  }, []);

  useEffect(() => {
    if (pathname === '/auth' || pathname === '/reset-password') return;

    const preload = () => {
      void Promise.allSettled([
        loadSettingsPage(),
        loadOrganizationBoardPage(),
        loadOrganizationPage(),
        loadAnalyticsPage(),
      ]);
    };

    const idleWindow = window as Window & typeof globalThis & {
      cancelIdleCallback?: (handle: number) => void;
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(preload, { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timer = globalThis.setTimeout(preload, 500);
    return () => globalThis.clearTimeout(timer);
  }, [pathname]);

  let page;
  let isProtectedPage = false;

  if (pathname.startsWith('/join/')) {
    page = <JoinOrganizationPage />;
  } else switch (pathname) {
    case '/auth':
      page = <PublicOnlyRoute><AuthPage /></PublicOnlyRoute>;
      break;
    case '/reset-password':
      page = <ResetPasswordPage />;
      break;
    case '/dashboard':
      isProtectedPage = true;
      page = <DashboardPage />;
      break;
    case '/analytics':
      isProtectedPage = true;
      page = <AnalyticsPage />;
      break;
    case '/profile':
      isProtectedPage = true;
      page = <ProfilePage />;
      break;
    case '/settings':
      isProtectedPage = true;
      page = <SettingsPage />;
      break;
    case '/organization':
      isProtectedPage = true;
      page = <OrganizationPage />;
      break;
    case '/organization-board':
      isProtectedPage = true;
      page = <OrganizationBoardPage />;
      break;
    default:
      window.location.replace('/');
      return <PageLoadingScreen />;
  }

  return (
    <AuthProvider>
      {isProtectedPage ? (
        <ProtectedRoute>
          <AppLayout pageTitle={pageTitle}>
            <Suspense fallback={<PageBodyLoading />}>{page}</Suspense>
          </AppLayout>
        </ProtectedRoute>
      ) : (
        <Suspense fallback={<PageLoadingScreen />}>{page}</Suspense>
      )}
    </AuthProvider>
  );
}
