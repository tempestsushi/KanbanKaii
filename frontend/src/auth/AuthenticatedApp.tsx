import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';
import { AppLayout } from '@/components/layout/AppLayout';
import { appNavigateEvent } from '@/lib/navigation';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const OrganizationPage = lazy(() => import('@/pages/OrganizationPage').then((module) => ({ default: module.OrganizationPage })));
const OrganizationBoardPage = lazy(() => import('@/pages/OrganizationBoardPage').then((module) => ({ default: module.OrganizationBoardPage })));
const JoinOrganizationPage = lazy(() => import('@/pages/JoinOrganizationPage').then((module) => ({ default: module.JoinOrganizationPage })));

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
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="flex items-center gap-3 rounded-full border border-violet-100 bg-white px-5 py-3 text-xs font-semibold text-violet-700 shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
        Loading page…
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
