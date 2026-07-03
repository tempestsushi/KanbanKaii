import { lazy, Suspense } from 'react';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute, PublicOnlyRoute } from './RouteGuards';

const AuthPage = lazy(() => import('@/pages/AuthPage').then((module) => ({ default: module.AuthPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));

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

export default function AuthenticatedApp() {
  const pathname = window.location.pathname;
  let page;

  switch (pathname) {
    case '/auth':
      page = <PublicOnlyRoute><AuthPage /></PublicOnlyRoute>;
      break;
    case '/dashboard':
      page = <ProtectedRoute><DashboardPage /></ProtectedRoute>;
      break;
    case '/analytics':
      page = <ProtectedRoute><AnalyticsPage /></ProtectedRoute>;
      break;
    case '/profile':
      page = <ProtectedRoute><ProfilePage /></ProtectedRoute>;
      break;
    case '/settings':
      page = <ProtectedRoute><SettingsPage /></ProtectedRoute>;
      break;
    default:
      window.location.replace('/');
      return <PageLoadingScreen />;
  }

  return (
    <AuthProvider>
      <Suspense fallback={<PageLoadingScreen />}>
        {page}
      </Suspense>
    </AuthProvider>
  );
}
